import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
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
            backgroundImage: 'url(/netflix-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="text-red-600 font-bold text-4xl">NETFLIX</div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4 max-w-3xl mx-auto">
            Unlimited movies, TV shows, and more
          </h1>
          <p className="text-2xl mb-8">
            Watch anywhere. Cancel anytime.
          </p>
          <Button 
            size="lg" 
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-xl rounded"
          >
            Get Started
            <ChevronRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}