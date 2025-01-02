import { Button } from "@/components/ui/button";
import { ChevronRight, CreditCard } from "lucide-react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation("/payment");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div 
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0, rgba(0, 0, 0, 0.3) 60%, rgba(0, 0, 0, 0.8) 100%)',
        }}
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: 'url(/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div 
              className="text-red-600 font-bold text-4xl cursor-pointer" 
              onClick={() => setLocation("/")}
            >
              DUBCRIBUTIONS
            </div>
            <Button 
              variant="outline"
              className="text-white border-white hover:bg-white/20"
              onClick={() => setLocation("/login")}
            >
              Sign In
            </Button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4 max-w-3xl mx-auto">
            Subscribe to Premium Features
          </h1>
          <p className="text-2xl mb-8">
            Get access to all features with our flexible payment options
          </p>
          <Button 
            size="lg" 
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-xl rounded"
            onClick={handleGetStarted}
          >
            <span className="mr-2">Subscribe Now</span>
            <CreditCard className="h-6 w-6" />
          </Button>
          <p className="mt-4 text-sm text-gray-400">
            Secure payments via VISA, Mastercard, or PayPal
          </p>
        </div>
      </div>
    </div>
  );
}