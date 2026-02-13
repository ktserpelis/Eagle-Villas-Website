import { Router } from "express";
import { prisma } from "../prismaClient.js"; // or wherever you export PrismaClient

export const propertyRouter = Router();

// GET /api/properties
propertyRouter.get("/", async (req, res, next) => {
  try {
    const properties = await prisma.property.findMany({
      include: {
        images: true,
        features: true,
        // optional: include these if you want list page to show them too
        // amenities: true,
        // policies: true,
      },
    });
    res.json(properties);
  } catch (err) {
    next(err);
  }
});

// GET /api/properties/:slug
// GET /api/properties/:slug
propertyRouter.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const property = await prisma.property.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        features: true,
        amenities: { orderBy: { sortOrder: "asc" } },
        policies: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);
  } catch (err) {
    next(err);
  }
});

