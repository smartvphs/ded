import { compatibilityMakes, readSpecification } from "./product-catalog";
export const productTypes = {
  parts: "part",
  oil: "oil",
  tires: "tire",
  services: "service",
  accessories: "accessory",
};
export function productRow(row) {
  const specs = Array.isArray(row.specifications) ? row.specifications : [];
  const viscosity = readSpecification(specs, "oil_viscosity", [
      row.viscosity,
      row.oil_viscosity,
    ]),
    size = readSpecification(specs, "tire_rim_size", [
      row.rim_size,
      row.tire_rim_size,
    ]),
    installation = readSpecification(specs, "installation_type", [
      row.installation,
    ]);
  return {
    ...row,
    name: row.name || row.name_en || "—",
    subtitle: row.subcategory_name_ar || row.category_name_ar || "",
    published: row.status === "published",
    deleted: row.status === "deleted" || row.is_deleted === true,
    price: row.discount_price ?? row.price,
    quality:
      (row.highestQuality?.qualityName ??
        row.highest_quality?.quality_name ??
        row.quality_name) ||
      {
        original: "قطعة أصلية",
        oem: "قطعة بديلة",
        aftermarket: "قطعة بديلة",
        used: "مستعمل",
      }[row.quality_tier] ||
      "—",
    lowQuality:
      row.lowestQuality?.qualityName ??
      row.lowest_quality?.quality_name ??
      null,
    lowQualityPrice:
      row.lowestQuality?.discountPrice ??
      row.lowestQuality?.price ??
      row.lowest_quality?.discount_price ??
      row.lowest_quality?.price,
    highQualityPrice:
      row.highestQuality?.discountPrice ??
      row.highestQuality?.price ??
      row.highest_quality?.discount_price ??
      row.highest_quality?.price,
    carMakes:
      Array.isArray(row.carMakes) && row.carMakes.length
        ? row.carMakes.map((x) => ({
            id: x.id,
            name: x.nameAr ?? x.nameEn ?? "—",
            nameEn: x.nameEn,
            logo: x.logoUrl,
          }))
        : compatibilityMakes(row.compatibility),
    rating: row.reviews_count ?? null,
    averageRating: row.rating ?? null,
    company: row.brand_name || "—",
    viscosity: viscosity.conflict ? "قيم متعارضة" : viscosity.value || "—",
    viscosityWarning: viscosity.conflict
      ? "قيم اللزوجة المسجلة: " + viscosity.values.join("، ")
      : undefined,
    size: size.conflict ? "قيم متعارضة" : size.value || "—",
    sizeWarning: size.conflict
      ? "مقاسات الجنط المسجلة: " + size.values.join("، ")
      : undefined,
    installation: installation.conflict
      ? "قيم متعارضة"
      : installation.value || "—",
    customer: row.customer_name || "—",
    phone: row.customer_phone || "",
    brand: null,
    brands: [],
    image: null,
  };
}
