import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, register } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isLogin) {
        await login({ username, password });
        toast({
          title: "Success",
          description: "Successfully logged in",
        });
      } else {
        await register({ username, password });
        toast({
          title: "Success",
          description: "Successfully registered",
        });
      }
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
        >
          <Card className="w-full max-w-md bg-background/95 backdrop-blur">
            <CardHeader>
              <CardTitle>{isLogin ? "Login" : "Register"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Button type="submit">
                    {isLogin ? "Login" : "Register"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? "Need an account? Register" : "Have an account? Login"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}
