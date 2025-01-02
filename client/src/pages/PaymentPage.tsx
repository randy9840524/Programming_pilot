import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { SiVisa, SiMastercard, SiPaypal } from "react-icons/si";

interface PaymentForm {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  name: string;
}

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
  const { register, handleSubmit } = useForm<PaymentForm>();

  const onSubmit = async (data: PaymentForm) => {
    console.log("Payment data:", data);
    // Handle payment processing here
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Subscription</CardTitle>
          <CardDescription>Choose your preferred payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4 justify-center">
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                onClick={() => setPaymentMethod("card")}
                className="flex-1"
              >
                <div className="flex gap-2">
                  <SiVisa className="h-6 w-6" />
                  <SiMastercard className="h-6 w-6" />
                </div>
              </Button>
              <Button
                variant={paymentMethod === "paypal" ? "default" : "outline"}
                onClick={() => setPaymentMethod("paypal")}
                className="flex-1"
              >
                <SiPaypal className="h-6 w-6" />
              </Button>
            </div>

            {paymentMethod === "card" ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Input
                    placeholder="Card Number"
                    {...register("cardNumber")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="MM/YY"
                    {...register("expiryDate")}
                  />
                  <Input
                    placeholder="CVV"
                    type="password"
                    maxLength={3}
                    {...register("cvv")}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Name on Card"
                    {...register("name")}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Pay Now
                </Button>
              </form>
            ) : (
              <Button
                onClick={() => window.location.href = "https://paypal.com"}
                className="w-full"
              >
                Continue with PayPal
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            Cancel
          </Button>
          <div className="text-sm text-muted-foreground">
            Secure Payment
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
