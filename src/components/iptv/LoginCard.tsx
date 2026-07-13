"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tv, Loader2, Server, User, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIPTVStore } from "@/lib/iptv-store";
import { authenticate } from "@/lib/iptv-client";

export function LoginCard() {
  const router = useRouter();
  const { credentials, setCredentials, setAuthenticated } = useIPTVStore();
  const [form, setForm] = useState(credentials);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      setCredentials(form);
      const data = await authenticate(form);
      if (data.user_info.auth === 1) {
        setAuthenticated(true);
        router.refresh();
      } else {
        setError(data.user_info.message || "Credenciais inválidas");
      }
    } catch (err: any) {
      setError(err.message || "Falha ao conectar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full bg-zinc-800/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-purple-600 mb-4 shadow-lg shadow-red-500/30">
            <Tv className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ZapStream</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Seu player IPTV na web
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server" className="text-zinc-300">
                Servidor
              </Label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="server"
                  type="text"
                  required
                  value={form.server}
                  onChange={(e) =>
                    setForm({ ...form, server: e.target.value })
                  }
                  placeholder="https://seu-servidor.com"
                  className="bg-zinc-800/50 border-zinc-700 text-white pl-10 focus-visible:ring-red-500/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user" className="text-zinc-300">
                Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="user"
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  placeholder="seu_usuario"
                  className="bg-zinc-800/50 border-zinc-700 text-white pl-10 focus-visible:ring-red-500/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pass" className="text-zinc-300">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="pass"
                  type={showPass ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="sua_senha"
                  className="bg-zinc-800/50 border-zinc-700 text-white pl-10 pr-10 focus-visible:ring-red-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <Alert className="bg-red-950/50 border-red-800 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-medium shadow-lg shadow-red-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <p className="text-xs text-zinc-500 mt-4 text-center">
            Conexão segura via proxy. Suas credenciais ficam apenas neste navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
