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
  description:
    "Kroger, Ralphs, Fred Meyer, Harris Teeter, and other Kroger family stores",

  // Config fields needed during init
  configFields: [
    {
      key: "banner",
      label: "Store Banner",
      message: "Which store do you shop at?",
      type: "select",
      choices: [
        { name: "Kroger", value: "kroger" },
        { name: "Fred Meyer", value: "fredmeyer" },
        { name: "Ralphs", value: "ralphs" },
        { name: "Harris Teeter", value: "harristeeter" },
        { name: "Fry's Food", value: "frysfood" },
        { name: "QFC", value: "qfc" },
        { name: "King Soopers", value: "kingsoopers" },
        { name: "Smith's", value: "smiths" },
        { name: "Dillons", value: "dillons" },
      ],
    },
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

  // Cart URLs by banner
  cartUrls: {
    kroger: "https://www.kroger.com/cart",
    ralphs: "https://www.ralphs.com/cart",
    fredmeyer: "https://www.fredmeyer.com/cart",
    harristeeter: "https://www.harristeeter.com/cart",
    frysfood: "https://www.frysfood.com/cart",
    qfc: "https://www.qfc.com/cart",
    kingsoopers: "https://www.kingsoopers.com/cart",
    smiths: "https://www.smithsfoodanddrug.com/cart",
    dillons: "https://www.dillons.com/cart",
  },

  // Email search patterns for receipt import
  receiptEmailPatterns: {
    from: [
      "kroger.com",
      "ralphs.com",
      "fredmeyer.com",
      "harristeeter.com",
      "frysfood.com",
      "qfc.com",
      "kingsoopers.com",
    ],
    subject: ["receipt", "order summary", "your order", "purchase"],
  },
};

export default krogerProvider;
