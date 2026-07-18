"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tv, Plus, Pencil, Trash2, Server, Loader2, ArrowLeft, RefreshCw, AlertCircle, BarChart3, Lock, EyeOff, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

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
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ServerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passInput }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem("admin_auth", "true");
        setAuthenticated(true);
      } else {
        setPassError("Senha incorreta");
      }
    } catch {
      setPassError("Erro ao verificar senha");
    }
  };

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

  if (checking) return null;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Admin</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="Senha de administrador"
              className="bg-zinc-800/50 border-zinc-700 text-white text-center text-lg h-12"
              autoFocus
            />
            {passError && (
              <p className="text-red-400 text-sm text-center">{passError}</p>
            )}
            <Button type="submit" className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white h-12 text-lg">
              <Lock className="h-4 w-4 mr-2" />
              Entrar
            </Button>
          </form>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadServers} className="text-zinc-400 hover:text-white">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin/traffic")} className="text-zinc-400 hover:text-white">
              <BarChart3 className="h-4 w-4 mr-1" />
              Tráfego
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { sessionStorage.removeItem("admin_auth"); setAuthenticated(false); }}
              className="text-zinc-400 hover:text-red-400"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sair
            </Button>
          </div>
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
                  <div key={server.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${server.active ? "bg-zinc-800/30 border-zinc-800/50 hover:border-zinc-700/50" : "bg-zinc-800/10 border-zinc-800/30 opacity-60"}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${server.active ? "bg-green-500 shadow-lg shadow-green-500/30" : "bg-zinc-600"}`} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{server.name}</p>
                        <p className="text-sm truncate text-zinc-400">{server.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs text-zinc-500">{server.active ? "Ativo" : "Inativo"}</span>
                        <Switch
                          checked={server.active}
                          onCheckedChange={() => handleToggleActive(server)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleEdit(server)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
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

        {/* Abas */}
        <TabControlCard />

        {/* Controle Parental */}
        <ParentalControlCard />
      </div>
    </div>
  );
}

function TabControlCard() {
  const [open, setOpen] = useState(false);
  const [disabledTabs, setDisabledTabs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const ALL_TABS = [
    { id: "live", label: "TV ao Vivo" },
    { id: "vod", label: "Filmes" },
    { id: "series", label: "Séries" },
    { id: "canais", label: "Canais" },
    { id: "favoritos", label: "Favoritos" },
  ];

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => { if (s?.disabledTabs) setDisabledTabs(s.disabledTabs); })
      .catch(() => {});
  }, []);

  const toggleTab = (id: string) => {
    setDisabledTabs((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabledTabs }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800 mt-6">
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-orange-500" />
          Abas
          <span className="text-xs text-zinc-500 font-normal ml-auto">
            {open ? "Clique para recolher" : "Clique para expandir"}
          </span>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent>
          <p className="text-sm text-zinc-400 mb-4">
            Desabilite abas que não deseja exibir no site.
          </p>
          <div className="space-y-3">
            {ALL_TABS.map((tab) => {
              const disabled = disabledTabs.includes(tab.id);
              return (
                <div key={tab.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
                  <span className={`text-sm ${disabled ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                    {tab.label}
                  </span>
                  <Switch
                    checked={!disabled}
                    onCheckedChange={() => toggleTab(tab.id)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              );
            })}
            <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-500 text-white mt-2">
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ParentalControlCard() {
  const [open, setOpen] = useState(false);
  const [adultInput, setAdultInput] = useState("");
  const [pin, setPin] = useState("123456");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s?.adultCategories) setAdultInput(s.adultCategories.join(", "));
        if (s?.pin) setPin(s.pin);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const cats = adultInput.split(",").map((s: string) => s.trim()).filter(Boolean);
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adultCategories: cats, pin }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800 mt-6">
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <CardTitle className="text-lg text-zinc-200 flex items-center gap-2">
          <Lock className="h-4 w-4 text-yellow-500" />
          Controle Parental
          <span className="text-xs text-zinc-500 font-normal ml-auto">
            {open ? "Clique para recolher" : "Clique para expandir"}
          </span>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent>
          <p className="text-sm text-zinc-400 mb-4">
            Configure categorias de conteúdo adulto que exigirão PIN para acessar.
          </p>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Categorias Adultas</Label>
              <p className="text-xs text-zinc-500 mb-1">
                Nomes das categorias separados por vírgula (ex: Erótico, Adultos, XXX)
              </p>
              <Input
                value={adultInput}
                onChange={(e) => setAdultInput(e.target.value)}
                placeholder="Erótico, Adultos, XXX"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">PIN de Acesso</Label>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="bg-zinc-800 border-zinc-700 text-white w-40"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-yellow-600 hover:bg-yellow-500 text-white">
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
