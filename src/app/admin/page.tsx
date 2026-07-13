"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tv, Plus, Pencil, Trash2, Server, Loader2, ArrowLeft, RefreshCw, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ServerItem {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  active: boolean;
  createdAt: string;
}

interface ServerForm {
  name: string;
  url: string;
  username: string;
  password: string;
}

const emptyForm: ServerForm = { name: "", url: "", username: "", password: "" };

export default function AdminPage() {
  const router = useRouter();
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ServerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadServers = async () => {
    try {
      const res = await fetch("/api/admin/servers");
      const data = await res.json();
      if (Array.isArray(data)) setServers(data);
    } catch (e: any) {
      setError("Erro ao carregar servidores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadServers(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await fetch("/api/admin/servers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadServers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (server: ServerItem) => {
    setForm({ name: server.name, url: server.url, username: server.username, password: server.password });
    setEditingId(server.id);
    setError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este servidor?")) return;
    try {
      const res = await fetch(`/api/admin/servers?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      await loadServers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggleActive = async (server: ServerItem) => {
    try {
      await fetch("/api/admin/servers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: server.id, active: !server.active }),
      });
      await loadServers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="text-zinc-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Tv className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Admin</h1>
              </div>
              <p className="text-zinc-400 text-sm mt-1 ml-[3.25rem]">
                Gerenciar servidores IPTV
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={loadServers} className="text-zinc-400 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-950/50 border-red-800 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Editar Servidor" : "Adicionar Servidor"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-zinc-300">Nome</Label>
                <Input
                  id="name" required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Meu Servidor"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="url" className="text-zinc-300">URL do Servidor</Label>
                <Input
                  id="url" required
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://servidor.com"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username" className="text-zinc-300">Usuário</Label>
                  <Input
                    id="username" required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="usuario"
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-zinc-300">Senha</Label>
                  <Input
                    id="password" required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="senha"
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : editingId ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {saving ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="text-zinc-400">
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
              <Server className="h-4 w-4" />
              Servidores ({servers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : servers.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Server className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum servidor cadastrado</p>
                <p className="text-sm">Adicione seu primeiro servidor acima</p>
              </div>
            ) : (
              <div className="space-y-3">
                {servers.map((server) => (
                  <div key={server.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${server.active ? "bg-green-500" : "bg-zinc-600"}`} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{server.name}</p>
                        <p className="text-sm text-zinc-400 truncate">{server.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleEdit(server)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleToggleActive(server)} title={server.active ? "Desativar" : "Ativar"}>
                        {server.active ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-zinc-600" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => handleDelete(server.id)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
