import { login, logout, getAccessToken } from "./auth.js";
import {
  searchProducts,
  getProduct,
  searchLocations,
  addToCart,
  getProfile,
} from "./api.js";

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
};

export default krogerProvider;
