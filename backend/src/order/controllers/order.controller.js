// Please don't change the pre-written code
// Import the necessary modules here

import { createNewOrderRepo } from "../model/order.repository.js";
import { ErrorHandler } from "../../../utils/errorHandler.js";

export const createNewOrder = async (req, res, next) => {
  const {
    shippingInfo,
    orderedItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  try {
    // Create order data to be saved
    const orderData = {
      shippingInfo,
      orderedItems,
      paymentInfo,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      user: req.user._id, // Assuming the logged-in user's ID is available in req.user
      paidAt: Date.now(), // Set the paidAt date to the current date
    };

    // Call the repository function to create a new order
    const order = await createNewOrderRepo(orderData);

    // Send success response with the created order
    return res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    // Handle any errors that occur
    return next(new ErrorHandler(500, "Order creation failed."));
  }
};
