export type Product = {
  id: string;
  title: string;
  price: number;
  description: string;
}

export type CreateProduct = {
  title: string;
  price: number;
  description: string;
  count: number;
}

export type Stock = {
  product_id: string;
  count: number;
}