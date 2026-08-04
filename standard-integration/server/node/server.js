import express from "express";
import cors from 'cors';
import "dotenv/config";
import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  LogLevel,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import bodyParser from "body-parser";

const app = express();
app.use(cors({
  origin: 'https://standard-client.onrender.com'
}));
app.use(bodyParser.json());

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PORT = 8080, ENV } = process.env;

const order = {
    "intent": "CAPTURE",
    "payment_source": {
        "paypal": {
            "experience_context": {
                "brand_name": "Brand name test",
                "shipping_preference": "NO_SHIPPING",
                "landing_page": "LOGIN",
                "payment_method_preference": "IMMEDIATE_PAYMENT_REQUIRED",
                "return_url": "https://ynabe.com/dmz/ApmConnector/E41AFBFC6C9F8C94021C60BC5715019B",
                "cancel_url": "https://ynabe.com/dmz/ApmConnector/E41AFBFC6C9F8C94021C60BC5715019B",
                "user_action": "PAY_NOW",
                "app_switch_context": {
                    "mobile_web": {
                        "return_flow": "AUTO",
                        "buyer_user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1"
                    }
                }
            }
        }
    },
    "purchase_units": [
        {
            "description": "BA Description",
            "amount": {
                "value": "1.00",
                "currency_code": "USD"
            },
            "shipping": {
                "address": {
                    "address_line_1": "xxxxxx",
                    "admin_area_2": "Ontario",
                    "postal_code": "M6T 1J1",
                    "country_code": "US"
                },
                "name": {
                    "full_name": "xxxxxx"
                }
            },
            "custom_id": "asdf",
            "invoice_id": "asdf-d399-48d7-8ea5-41f89619d2fa6",
            "soft_descriptor": "test Descriptor"
        }
    ]
}

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment: ENV === 'production' ? Environment.Production : Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: {
      logBody: true,
    },
    logResponse: {
      logHeaders: true,
    },
  },
});

const ordersController = new OrdersController(client);

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder = async (cart) => {
  
  try {
    const token = await client.clientCredentialsAuthManager.fetchToken();
    const apiHost = ENV === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com'
    const res = await fetch(`https://${apiHost}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.accessToken}`
      },
      body: JSON.stringify(order)
    })
    const json = await res.json()    
    
    return {
      jsonResponse: json,
      httpStatusCode: res.status
    };
  } catch (error) {
    console.dir(error)
    if (error instanceof ApiError) {
      // const { statusCode, headers } = error;
      throw new Error(error.message);
    }
  }
};

/**
 * Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
const captureOrder = async (orderID) => {
  const collect = {
    id: orderID,
    prefer: "return=minimal",
  };

  try {
    const { body, ...httpResponse } = await ordersController.ordersCapture(
      collect
    );
    // Get more response info...
    // const { statusCode, headers } = httpResponse;
    return {
      jsonResponse: JSON.parse(body),
      httpStatusCode: httpResponse.statusCode,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      // const { statusCode, headers } = error;
      throw new Error(error.message);
    }
  }
};

app.post("/api/orders", async (req, res) => {
  try {
    // use the cart information passed from the front-end to calculate the order amount detals
    const { cart } = req.body;
    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

app.listen(PORT, () => {
  console.log(`Node server listening at http://localhost:${PORT}/`);
});
