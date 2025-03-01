import { CreateProduct } from '../types/types';

export const validateProduct = (product: CreateProduct) => {
  const errors = [];
  
  if (!product.title) {
    errors.push('Title is required');
  }
  
  if (!product.price) {
    errors.push('Price is required');
  } else if (isNaN(Number(product.price)) || Number(product.price) <= 0) {
    errors.push('Price must be a positive number');
  }

  if (!product.description) {
    errors.push('Description is required');
  }

  if (!product.count) {
    errors.push('Count is required');
  } else if (isNaN(Number(product.count)) || Number(product.count) <= 0) {
    errors.push('Count must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    isError: errors.length !== 0,
    errors
  };
};
