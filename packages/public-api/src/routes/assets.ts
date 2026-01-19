import type { Request, Response } from "express";
import { z } from "zod";

import { getAllAssets, getAsset, getAssetIds } from "../assets";
import type { AssetsResponse, ErrorResponse } from "../types";

// Request validation schema for single asset
export const AssetRequestSchema = z.object({
  assetId: z.string().min(1).openapi({ example: "eip155:1/slip44:60" }),
});

// Request validation schema for filtered list
export const AssetsListRequestSchema = z.object({
  chainId: z.string().optional().openapi({ example: "eip155:1" }),
  limit: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .openapi({ example: 100 }),
  offset: z.coerce
    .number()
    .min(0)
    .optional()
    .default(0)
    .openapi({ example: 0 }),
});

export const getAssets = (req: Request, res: Response): void => {
  try {
    const parseResult = AssetsListRequestSchema.safeParse(req.query);
    if (!parseResult.success) {
      const errorResponse: ErrorResponse = {
        error: "Invalid request parameters",
        details: parseResult.error.errors,
      };
      res.status(400).json(errorResponse);
      return;
    }

    const { chainId, limit, offset } = parseResult.data;

    let assets = getAllAssets();

    // Filter by chain if specified
    if (chainId) {
      assets = assets.filter((asset) => asset.chainId === chainId);
    }

    // Apply pagination
    const paginatedAssets = assets.slice(offset, offset + limit);

    const response: AssetsResponse = {
      assets: paginatedAssets,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getAssets:", error);
    res.status(500).json({ error: "Internal server error" } as ErrorResponse);
  }
};

export const getAssetById = (req: Request, res: Response): void => {
  try {
    const parseResult = AssetRequestSchema.safeParse(req.params);
    if (!parseResult.success) {
      const errorResponse: ErrorResponse = {
        error: "Invalid request parameters",
        details: parseResult.error.errors,
      };
      res.status(400).json(errorResponse);
      return;
    }

    const { assetId } = parseResult.data;
    // URL decode the assetId since it contains special characters
    let decodedAssetId: string;
    try {
      decodedAssetId = decodeURIComponent(assetId);
    } catch {
      const errorResponse: ErrorResponse = {
        error: "Invalid URL encoding for assetId",
        details: { assetId },
      };
      res.status(400).json(errorResponse);
      return;
    }
    const asset = getAsset(decodedAssetId);

    if (!asset) {
      res
        .status(404)
        .json({ error: `Asset not found: ${decodedAssetId}` } as ErrorResponse);
      return;
    }

    res.json(asset);
  } catch (error) {
    console.error("Error in getAssetById:", error);
    res.status(500).json({ error: "Internal server error" } as ErrorResponse);
  }
};

export const getAssetCount = (_req: Request, res: Response): void => {
  try {
    const count = getAssetIds().length;
    res.json({ count, timestamp: Date.now() });
  } catch (error) {
    console.error("Error in getAssetCount:", error);
    res.status(500).json({ error: "Internal server error" } as ErrorResponse);
  }
};
