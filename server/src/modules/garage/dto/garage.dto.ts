import { z } from 'zod';

export const listForSaleSchema = z.object({
  plate: z.string().min(1, 'Plate is required'),
  price: z.number().int().positive('Price must be positive').max(100000000, 'Price exceeds maximum'),
});

export const buyVehicleSchema = z.object({
  plate: z.string().min(1, 'Plate is required'),
});

export const cancelListingSchema = z.object({
  plate: z.string().min(1, 'Plate is required'),
});

export type ListForSaleInput = z.infer<typeof listForSaleSchema>;
export type BuyVehicleInput = z.infer<typeof buyVehicleSchema>;
