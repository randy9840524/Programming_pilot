import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";

export default function HomePage() {
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation("/editor");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-black text-white">
        <motion.div 
          className="relative min-h-screen flex items-center justify-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{
            backgroundImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0, rgba(0, 0, 0, 0.3) 60%, rgba(0, 0, 0, 0.8) 100%)',
          }}
        >
          {/* Background Animation */}
          <motion.div 
            className="absolute inset-0 -z-10 bg-black"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          />

          {/* Header with Logo and Sign In */}
          <motion.header 
            className="absolute top-0 left-0 right-0 p-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: 0.2 
            }}
          >
            <div className="container mx-auto flex justify-between items-center">
              <motion.div 
                className="text-red-600 font-bold text-4xl cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLocation("/")}
              >
                DEVSOL
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline"
                  className="text-white border-white hover:bg-white/20"
                  onClick={() => setLocation("/login")}
                >
                  Sign In
                </Button>
              </motion.div>
            </div>
          </motion.header>

          {/* Main Content */}
          <div className="container mx-auto px-4 text-center">
            <motion.h1 
              className="text-5xl font-bold mb-4 max-w-3xl mx-auto"
              variants={itemVariants}
            >
              Next-Generation Development Environment
            </motion.h1>
            <motion.p 
              className="text-2xl mb-8"
              variants={itemVariants}
            >
              Experience seamless development with AI-powered assistance
            </motion.p>
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-xl rounded"
                onClick={handleGetStarted}
              >
                <span className="mr-2">Get Started</span>
                <CreditCard className="h-6 w-6" />
              </Button>
            </motion.div>
            <motion.p 
              className="mt-4 text-sm text-gray-400"
              variants={itemVariants}
            >
              Start coding in seconds, no setup required
            </motion.p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}