import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { SiFacebook, SiGoogle, SiGithub } from "react-icons/si";
import PageTransition from "@/components/PageTransition";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      toast({
        title: "Success",
        description: "Successfully logged in",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSocialLogin = (provider: string) => {
    // TODO: Implement social login
    toast({
      title: "Info",
      description: `${provider} login coming soon`,
    });
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center">
            <span className="mr-2">
              <motion.div
                className="w-10 h-10 bg-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </span>
            ClientZone
          </h1>
        </div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md"
        >
          <Card className="bg-white shadow-xl">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-6 text-center">
                Log into ClientZone
              </h2>
              <p className="text-sm text-gray-600 mb-6 text-center">
                Enter the email address used to sign up your affilihost accounts along with your ClientZone password
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setLocation("/forgot-password")}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Forgot Password
                  </button>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Login
                </Button>
                <p className="text-xs text-center text-gray-600 mt-4">
                  By logging in you accept our latest Terms and Conditions
                </p>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      Or login with
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('Facebook')}
                    className="w-full"
                  >
                    <SiFacebook className="h-5 w-5 text-blue-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('Google')}
                    className="w-full"
                  >
                    <SiGoogle className="h-5 w-5 text-red-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('Github')}
                    className="w-full"
                  >
                    <SiGithub className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}