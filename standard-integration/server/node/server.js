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

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PORT = 8080 } = process.env;

const order = {
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "amount": {
        "currency_code": "USD",
        "value": "10.12"
      }
    }
  ],
  "payment_source": {
    "paypal": {
      //"email_address": "ywatanabe+usbuyer@paypal.com",
      "experience_context": {
        "user_action": "PAY_NOW",
        "return_url": "https://standard-client.onrender.com/",
        "cancel_url": "https://standard-client.onrender.com/",
        "payment_method_selected": "PAYPAL",
        //"app_switch_context": {
          //"native_app": {
            //"return_app_url": "https://gse-appstestbed.com/braintree-payments",
            //"cancel_app_url": "https://gse-appstestbed.com/braintree-payments",
            //"os_type": "ANDROID",
            //"os_version": "35"
          //}
        //}
      }
    }
  }
}

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment: Environment.Sandbox,
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
  const collect = {
    body: {
      intent: CheckoutPaymentIntent.Capture,
      paymentSource: {
        "paypal": {
          "emailAddress": "ywatanabe+buyer@paypal.com",                            
          "experienceContext": {
            "userAction": "PAY_NOW",
            "returnUrl": "https://standard-client.onrender.com/",
            "cancelUrl": "https://standard-client.onrender.com/",
            "paymentMethodSelected": "PAYPAL",
            "appSwitchContext": {
    "nativeApp": {
        "returnAppUrl": "https://gse-appstestbed.com/braintree-payments",
        "cancelAppUrl": "https://gse-appstestbed.com/braintree-payments",
        "osType": "ANDROID",
        "osVersion": "35"
    }
}

          }
        }
      },
      purchaseUnits: [
        {
          amount: {
            currencyCode: "USD",
            value: "10.00",
          },
        },
      ],
    }
  };

  try {

    const token = await client.clientCredentialsAuthManager.fetchToken();
    const res = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.accessToken}`
      },
      body: JSON.stringify(order)
    })
    const json = await res.json()    
    
    const { body, ...httpResponse } = await ordersController.ordersCreate(
      collect
    );
    // Get more response info...
    // const { statusCode, headers } = httpResponse;
    return {
      jsonResponse: json, //JSON.parse(body),
      httpStatusCode: httpResponse.statusCode,
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
