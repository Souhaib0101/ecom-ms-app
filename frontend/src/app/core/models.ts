export interface Customer {
  id: number;
  name: string;
  email: string;
}

export type CustomerInput = Omit<Customer, 'id'>;

export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export type ProductInput = Omit<Product, 'id'>;

export interface PageInfo {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface Page<T> extends PageInfo {
  items: T[];
}

export interface BillSummary {
  id: number;
  billingDate: string;
  customerId: number;
  itemCount: number;
  total: number;
}

export interface ProductItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  product: Product | null;
}

export interface Bill {
  id: number;
  billingDate: string;
  customerId: number;
  customer: Customer | null;
  productItems: ProductItem[];
  total: number;
}

export interface CreateBill {
  customerId: number;
  items: { productId: number; quantity: number }[];
}
