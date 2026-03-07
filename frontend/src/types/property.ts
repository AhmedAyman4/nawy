export interface PropertyData {
  id: string;
  location?: string | null;
  property_name?: string | null;
  description?: string | null;
  m2?: number | null;
  Beds?: number | null;
  Baths?: number | null;
  payment_plan?: string | null;
  price?: string | number | null;
  tag?: string | null;
  url_path?: string | null;
  cover_image?: string | null;
  developer_logo?: string | null;
  price_float?: number | null;
}
