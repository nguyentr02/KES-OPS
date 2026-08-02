import { ProductSubTabs } from "@/components/products/sub-tabs";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="mb-3 font-serif text-2xl font-semibold tracking-tight">
        Sản phẩm
      </h1>
      <ProductSubTabs />
      {children}
    </div>
  );
}
