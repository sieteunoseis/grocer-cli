import { login, logout, getAccessToken } from "./auth.js";
import {
  searchProducts,
  getProduct,
  searchLocations,
  addToCart,
  getProfile,
} from "./api.js";
import { parseReceipt } from "./receipt.js";

const krogerProvider = {
  name: "kroger",
  label: "Kroger",
  description: "Kroger, Ralphs, Fred Meyer, Harris Teeter, and other Kroger family stores",

  // Config fields needed during init
  configFields: [
    {
      key: "clientId",
      label: "Client ID",
      message: "Enter your Kroger API Client ID",
      help: "Register at https://developer.kroger.com to get your credentials",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      message: "Enter your Kroger API Client Secret",
      secret: true,
    },
  ],

  // Auth
  login,
  logout,
  getAccessToken,

  // API
  searchProducts,
  getProduct,
  searchLocations,
  addToCart,
  getProfile,

  // Receipt parsing
  parseReceipt,

  // Email search patterns for receipt import
  receiptEmailPatterns: {
    from: ["kroger.com", "ralphs.com", "fredmeyer.com", "harristeeter.com", "frysfood.com", "qfc.com", "kingsoopers.com"],
    subject: ["receipt", "order summary", "your order", "purchase"],
  },
};

export default krogerProvider;
