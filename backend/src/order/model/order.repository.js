import { ErrorHandler } from "../../../utils/errorHandler.js";
import OrderModel from "./order.schema.js";

export const createNewOrderRepo = async (data) => {
  // Write your code here for placing a new order
  try{
    const newOrder=new OrderModel(data);
    await newOrder.save();
    return newOrder;
  }
  catch(error){
    throw new ErrorHandler(500,"Failed to create a new Order");
  }
};
