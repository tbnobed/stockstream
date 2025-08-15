import Header from "@/components/layout/header";
import SupplierManagement from "@/components/supplier-management";

export default function Suppliers() {
  return (
    <>
      <Header
        title="Suppliers"
        subtitle="Manage your supplier contacts and information"
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        <SupplierManagement />
      </main>
    </>
  );
}