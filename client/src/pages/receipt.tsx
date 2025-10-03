import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, ShoppingCart, DollarSign, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ReceiptData {
  orderNumber: string;
  saleDate: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    totalAmount: string;
  }>;
  totalAmount: string;
  paymentMethod: string;
  salesAssociate?: {
    firstName: string;
    lastName: string;
    associateCode: string;
  } | null;
  volunteerEmail?: string | null;
  isExpired: boolean;
}

export default function Receipt() {
  const { token } = useParams();

  const { data: receipt, isLoading, error } = useQuery<ReceiptData>({
    queryKey: ['/api/receipts', token],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/receipts/${token}`);
      return response.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Receipt Not Found</h2>
            <p className="text-gray-600 mb-4">
              This receipt may have expired, been deleted, or the link is invalid.
            </p>
            <p className="text-sm text-gray-500">
              Digital receipts are only available for 90 days after purchase.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (receipt.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div className="text-orange-500 text-6xl mb-4">⏰</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Receipt Expired</h2>
            <p className="text-gray-600 mb-4">
              This receipt has expired and is no longer available for viewing.
            </p>
            <p className="text-sm text-gray-500">
              Digital receipts are only available for 90 days after purchase.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardTitle className="text-2xl font-bold">Digital Receipt</CardTitle>
            <div className="text-blue-100">
              <div className="text-lg font-semibold">Arizona Axemen Motorcycle Club</div>
              <div className="text-sm">Official Purchase Receipt</div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-blue-600" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Order Number</div>
                  <div className="font-semibold">{receipt.orderNumber}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-600" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Purchase Date</div>
                  <div className="font-semibold">{formatDate(receipt.saleDate)}</div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart size={20} />
                Items Purchased
              </h3>
              <div className="space-y-3">
                {receipt.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">${item.totalAmount}</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Quantity: {item.quantity}</span>
                      <span>Unit Price: ${item.unitPrice}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <CreditCard className="text-green-600" size={20} />
                <div>
                  <div className="text-sm text-gray-500">Payment Method</div>
                  <div className="font-semibold capitalize">{receipt.paymentMethod}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="text-blue-600" size={20} />
                <div>
                  <div className="text-sm text-gray-500">
                    {receipt.salesAssociate ? "Sales Associate" : "Volunteer"}
                  </div>
                  <div className="font-semibold">
                    {receipt.salesAssociate 
                      ? `${receipt.salesAssociate.firstName} ${receipt.salesAssociate.lastName}`
                      : receipt.volunteerEmail || "Volunteer"
                    }
                  </div>
                  {receipt.salesAssociate && (
                    <div className="text-xs text-gray-500">ID: {receipt.salesAssociate.associateCode}</div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Total */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="text-green-600" size={20} />
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-blue-600">${receipt.totalAmount}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-500 border-t pt-4">
              <p>Thank you for supporting the Arizona Axemen Motorcycle Club!</p>
              <p className="mt-1">This digital receipt will be available for 90 days.</p>
              <p className="mt-2 text-xs">
                For questions about your purchase, please contact us at{" "}
                <a href="mailto:info@axemenmcaz.com" className="text-blue-600 hover:underline">
                  info@axemenmcaz.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}