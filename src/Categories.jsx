import React, { useState } from "react";
import CategoryManager from "./CategoryManager";
import { imageHeights } from "./products-data";
import "./categories.css";
function CategoryArtwork({ id }) {
  const crops = {
    parts: ["06", 932, 411, 73, 75],
    oil: ["01", 713, 411, 86, 75],
    services: ["01", 274, 411, 74, 75],
  };
  if (!crops[id])
    return <img src={"/images/categories/" + id + ".png"} alt="" />;
  const [file, x, y, w, h] = crops[id];
  return (
    <svg
      className="category-artwork"
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <svg
        width={w}
        height={h}
        viewBox={`${x} ${y} ${w} ${h}`}
        overflow="hidden"
      >
        <image
          href={"/product-reference/" + file + ".png"}
          width="1440"
          height={imageHeights[file]}
        />
      </svg>
    </svg>
  );
}
const categories = [
  {
    id: "parts",
    name: "سوق قطع الغيار",
    description: "12 قطعة، 248 سيارة، و8 تصنيفات",
    metrics: [
      ["1,240", "منتج"],
      ["1,240", "طلب"],
      ["1,240", "تصنيف فرعي"],
    ],
  },
  {
    id: "oil",
    name: "الزيوت",
    description: "3 زيوت، 8 شركات، و5 لزوجة",
    metrics: [
      ["186", "منتج"],
      ["94", "طلب"],
      ["5", "فئة"],
    ],
  },
  {
    id: "tires",
    name: "إطارات",
    description: "6 شركات، 4 عرض، 6 ارتفاع، و10 قطر جنط",
    metrics: [
      ["186", "منتج"],
      ["94", "طلب"],
      ["5", "فئة"],
    ],
  },
  {
    id: "used",
    name: "قطع غيار السيارات المستعمل",
    description: "12 قطعة، 248 سيارة، و8 تصنيفات",
    metrics: [
      ["186", "منتج"],
      ["94", "طلب"],
      ["5", "فئة"],
    ],
  },
  {
    id: "services",
    name: "خدمات ماي بارت",
    description: "12 قطعة، و9 خدمات",
    metrics: [
      ["186", "خدمة"],
      ["94", "طلب"],
      ["5", "فئة"],
    ],
  },
  {
    id: "accessories",
    name: "العناية والإكسسوارات",
    description: "12 قطعة، 248 سيارة، و8 تصنيفات",
    metrics: [
      ["186", "منتج"],
      ["94", "طلب"],
      ["5", "فئة"],
    ],
  },
];
export default function Categories() {
  const [selected, setSelected] = useState(null);
  if (selected)
    return (
      <CategoryManager
        key={selected}
        category={selected}
        onBack={() => setSelected(null)}
      />
    );
  return (
    <section className="categories-content">
      <h1>التصنيفات الرئيسية</h1>
      <div className="categories-panel">
        <div className="categories-grid">
          {categories.map((category) => (
            <button
              key={category.id}
              className={
                "category-card category-card-button " +
                category.id +
                "-category"
              }
              onClick={() => setSelected(category.id)}
              aria-label={"فتح تصنيف " + category.name}
            >
              <div className="category-info">
                <h2>{category.name}</h2>
                <p>{category.description}</p>
                <dl className="category-metrics">
                  {category.metrics.map(([value, label]) => (
                    <div key={label}>
                      <dt>{value}</dt>
                      <dd>{label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="category-image">
                <CategoryArtwork id={category.id} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
