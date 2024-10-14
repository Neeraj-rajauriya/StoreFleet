// Please don't change the pre-written code
// Import the necessary modules here

import { ErrorHandler } from "../../../utils/errorHandler.js";
import {
  addNewProductRepo,
  deleProductRepo,
  findProductRepo,
  getAllProductsRepo,
  getProductDetailsRepo,
  getTotalCountsOfProduct,
  updateProductRepo,
} from "../model/product.repository.js";
import ProductModel from "../model/product.schema.js";

export const addNewProduct = async (req, res, next) => {
  try {
    const product = await addNewProductRepo({
      ...req.body,
      createdBy: req.user._id,
    });
    if (product) {
      res.status(201).json({ success: true, product });
    } else {
      return next(new ErrorHandler(400, "some error occured!"));
    }
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    const { keyword, category, priceRange, page = 1, limit = 10 } = req.query;

    // 1. Build the query object
    let query = {};

    // Search functionality: Check if a search keyword is provided, and use MongoDB's $regex operator for partial matching
    if (keyword) {
      query.name = { $regex: keyword, $options: "i" }; // Case-insensitive search on the product name
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by price range, e.g., ?priceRange=0-1000
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split("-");
      query.price = { $gte: minPrice, $lte: maxPrice }; // Match products within the price range
    }

    // 2. Pagination: Calculate the number of products to skip based on the page number and limit
    const skip = (page - 1) * limit;

    // 3. Fetch products from the database
    const products = await ProductModel.find(query)
      .limit(parseInt(limit)) // Set the limit of products per page
      .skip(skip) // Skip documents to paginate properly
      .exec();

    // 4. Get the total number of documents for pagination info
    const totalProducts = await ProductModel.countDocuments(query);

    // 5. Return the products, pagination info, and total count
    return res.status(200).json({
      success: true,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      products,
    });
  } catch (error) {
    return next(new ErrorHandler(500, error.message));
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const updatedProduct = await updateProductRepo(req.params.id, req.body);
    if (updatedProduct) {
      res.status(200).json({ success: true, updatedProduct });
    } else {
      return next(new ErrorHandler(400, "Product not found!"));
    }
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const deletedProduct = await deleProductRepo(req.params.id);
    if (deletedProduct) {
      res.status(200).json({ success: true, deletedProduct });
    } else {
      return next(new ErrorHandler(400, "Product not found!"));
    }
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const getProductDetails = async (req, res, next) => {
  try {
    const productDetails = await getProductDetailsRepo(req.params.id);
    if (productDetails) {
      res.status(200).json({ success: true, productDetails });
    } else {
      return next(new ErrorHandler(400, "Product not found!"));
    }
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const rateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { rating, comment } = req.body;
    const user = req.user._id;
    const name = req.user.name;
    const review = {
      user,
      name,
      rating: Number(rating),
      comment,
    };
    if (!rating) {
      return next(new ErrorHandler(400, "rating can't be empty"));
    }
    const product = await findProductRepo(productId);
    if (!product) {
      return next(new ErrorHandler(400, "Product not found!"));
    }
    const findRevieweIndex = product.reviews.findIndex((rev) => {
      return rev.user.toString() === user.toString();
    });
    if (findRevieweIndex >= 0) {
      product.reviews.splice(findRevieweIndex, 1, review);
    } else {
      product.reviews.push(review);
    }
    let avgRating = 0;
    product.reviews.forEach((rev) => {
      avgRating += rev.rating;
    });
    const updatedRatingOfProduct = avgRating / product.reviews.length;
    product.rating = updatedRatingOfProduct;
    await product.save({ validateBeforeSave: false });
    res
      .status(201)
      .json({ success: true, msg: "thx for rating the product", product });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};

export const getAllReviewsOfAProduct = async (req, res, next) => {
  try {
    const product = await findProductRepo(req.params.id);
    if (!product) {
      return next(new ErrorHandler(400, "Product not found!"));
    }
    res.status(200).json({ success: true, reviews: product.reviews });
  } catch (error) {
    return next(new ErrorHandler(400, error));
  }
};

export const deleteReview = async (req, res, next) => {
  // Insert the essential code into this controller wherever necessary to resolve issues related to removing reviews and updating product ratings.
  try {
    const { productId, reviewId } = req.query;
    if (!productId || !reviewId) {
      return next(
        new ErrorHandler(
          400,
          "pls provide productId and reviewId as query params"
        )
      );
    }
    const product = await findProductRepo(productId);
    if (!product) {
      return next(new ErrorHandler(400, "Product not found!"));
    }
    const reviews = product.reviews;

    const isReviewExistIndex = reviews.findIndex((rev) => {
      return rev._id.toString() === reviewId.toString();
    });
    if (isReviewExistIndex < 0) {
      return next(new ErrorHandler(400, "review doesn't exist"));
    }

    const reviewToBeDeleted = reviews[isReviewExistIndex];
    reviews.splice(isReviewExistIndex, 1);

    let avgRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
      avgRating = totalRating / reviews.length;
    }

    // Update the product's rating
    product.rating = avgRating;

    await product.save({ validateBeforeSave: false });
    res.status(200).json({
      success: true,
      msg: "review deleted successfully",
      deletedReview: reviewToBeDeleted,
      product,
    });
  } catch (error) {
    return next(new ErrorHandler(500, error));
  }
};
