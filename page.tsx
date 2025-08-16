"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Phone, Users, FileText, Search, ArrowLeft, Download, Copy, CheckCircle } from "lucide-react"
import jsPDF from "jspdf"
import { supabase, type ServiceRecord } from "@/lib/supabase/client"

type Screen = "home" | "login" | "technician" | "clients"

interface FormData {
  name: string
  address: string
  phone: string
  company: string
  service: string
  value: string
  warranty: string
  observations: string
  date: string
}

export default function GelotermApp() {
  console.log("[v0] Geloterm App iniciando...")

  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [password, setPassword] = useState("")
  const [showAlert, setShowAlert] = useState("")
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([])
  const [searchResults, setSearchResults] = useState<ServiceRecord[]>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supabaseAvailable, setSupabaseAvailable] = useState(false)

  useEffect(() => {
    loadServiceRecords()
  }, [])

  const loadServiceRecords = async () => {
    console.log("[v0] Carregando dados...")
    setLoading(true)

    // Primeiro carrega do localStorage
    try {
      const localData = localStorage.getItem("geloterm_service_records")
      if (localData) {
        const parsedData = JSON.parse(localData)
        setServiceRecords(parsedData)
        console.log("[v0] Dados carregados do localStorage:", parsedData.length, "registros")
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar localStorage:", error)
    }

    // Tenta sincronizar com Supabase se disponível
    try {
      const { data, error } = await supabase
        .from("service_records")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.log("[v0] Supabase não disponível:", error.message)
        setSupabaseAvailable(false)
      } else {
        console.log("[v0] Supabase disponível, dados sincronizados")
        setSupabaseAvailable(true)
        setServiceRecords(data || [])
        // Salva no localStorage como backup
        localStorage.setItem("geloterm_service_records", JSON.stringify(data || []))
      }
    } catch (error) {
      console.log("[v0] Erro de conexão Supabase, usando localStorage")
      setSupabaseAvailable(false)
    } finally {
      setLoading(false)
    }
  }

  const saveServiceRecord = async (record: Omit<ServiceRecord, "id" | "created_at" | "updated_at">) => {
    console.log("[v0] Salvando registro...")

    // Cria um registro completo com ID temporário
    const fullRecord: ServiceRecord = {
      ...record,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Sempre salva no localStorage primeiro
    try {
      const currentRecords = [...serviceRecords, fullRecord]
      setServiceRecords(currentRecords)
      localStorage.setItem("geloterm_service_records", JSON.stringify(currentRecords))
      console.log("[v0] Registro salvo no localStorage")
    } catch (error) {
      console.error("[v0] Erro ao salvar no localStorage:", error)
      return false
    }

    // Tenta salvar no Supabase se disponível
    if (supabaseAvailable) {
      try {
        const { data, error } = await supabase.from("service_records").insert([record]).select()
        if (error) {
          console.log("[v0] Erro no Supabase, mantendo localStorage:", error.message)
          setSupabaseAvailable(false)
        } else {
          console.log("[v0] Registro sincronizado com Supabase")
        }
      } catch (error) {
        console.log("[v0] Falha na conexão Supabase, mantendo localStorage")
        setSupabaseAvailable(false)
      }
    }

    return true
  }

  const [formData, setFormData] = useState<FormData>({
    name: "",
    address: "",
    phone: "",
    company: "",
    service: "",
    value: "",
    warranty: "",
    observations: "",
    date: new Date().toLocaleDateString("pt-BR"),
  })

  const [searchData, setSearchData] = useState({
    name: "",
    phone: "",
    date: "",
  })

  const handleLogin = () => {
    if (password === "b.boys123") {
      setCurrentScreen("technician")
      setPassword("")
      setShowAlert("")
    } else {
      setShowAlert("Senha incorreta!")
      setPassword("")
      setTimeout(() => setShowAlert(""), 3000)
    }
  }

  const generatePDF = async () => {
    console.log("[v0] Gerando PDF...")
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text("GELOTERM REFRIGERAÇÃO", 20, 30)
    doc.setFontSize(12)
    doc.text("Telefone: 41 9 9805-5975", 20, 40)

    doc.line(20, 45, 190, 45)

    doc.setFontSize(16)
    doc.text("NOTA DE SERVIÇO", 20, 60)

    doc.setFontSize(12)
    let yPos = 80
    doc.text(`Data: ${formData.date}`, 20, yPos)
    yPos += 10
    doc.text(`Cliente: ${formData.name}`, 20, yPos)
    yPos += 10
    doc.text(`Telefone: ${formData.phone}`, 20, yPos)
    yPos += 10
    doc.text(`Endereço: ${formData.address}`, 20, yPos)
    yPos += 10
    doc.text(`Empresa: ${formData.company}`, 20, yPos)
    yPos += 15

    doc.text("SERVIÇO REALIZADO:", 20, yPos)
    yPos += 10
    const serviceLines = doc.splitTextToSize(formData.service, 170)
    doc.text(serviceLines, 20, yPos)
    yPos += serviceLines.length * 5 + 10

    doc.text(`Valor: R$ ${formData.value}`, 20, yPos)
    yPos += 10
    doc.text(`Garantia: ${formData.warranty}`, 20, yPos)
    yPos += 15

    if (formData.observations) {
      doc.text("OBSERVAÇÕES:", 20, yPos)
      yPos += 10
      const obsLines = doc.splitTextToSize(formData.observations, 170)
      doc.text(obsLines, 20, yPos)
    }

    const fileName = `Nota_${formData.name.replace(/\s+/g, "_")}_${formData.date.replace(/\//g, "-")}.pdf`
    doc.save(fileName)
    console.log("[v0] PDF salvo:", fileName)

    const record = {
      client_name: formData.name,
      client_address: formData.address,
      client_phone: formData.phone,
      client_company: formData.company,
      service_description: formData.service,
      service_value: Number.parseFloat(formData.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0,
      warranty_months: Number.parseInt(formData.warranty.replace(/\D/g, "")) || 0,
      observations: formData.observations,
      service_date: formData.date,
    }

    const success = await saveServiceRecord(record)

    if (success) {
      const message = supabaseAvailable
        ? "PDF gerado e registro salvo na nuvem!"
        : "PDF gerado e registro salvo localmente!"
      setShowAlert(message)
      setTimeout(() => {
        setShowAlert("")
        openWhatsApp()
      }, 2000)
    }
  }

  const openWhatsApp = () => {
    const cleanPhone = formData.phone.replace(/\D/g, "")
    const phoneNumber = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`
    const message = `Olá ${formData.name}, segue a nota do serviço realizado no dia ${formData.date}.`
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const searchClients = () => {
    console.log("[v0] Buscando clientes. Total de registros:", serviceRecords.length)
    const results = serviceRecords.filter((record) => {
      const nameMatch = !searchData.name || record.client_name.toLowerCase().includes(searchData.name.toLowerCase())
      const phoneMatch = !searchData.phone || record.client_phone.includes(searchData.phone)
      const dateMatch = !searchData.date || record.service_date.includes(searchData.date)
      return nameMatch && phoneMatch && dateMatch
    })
    setSearchResults(results)
    console.log("[v0] Resultados encontrados:", results.length)
  }

  const copyResults = () => {
    const text = searchResults
      .map(
        (record) =>
          `${record.service_date} | ${record.client_name} | ${record.client_phone} | ${record.service_description} | R$ ${record.service_value} | ${record.warranty_months} meses | ${record.observations}`,
      )
      .join("\n")

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const downloadResults = () => {
    console.log("[v0] Baixando resultados...")

    const text = searchResults
      .map(
        (record) =>
          `Data: ${record.service_date}\nCliente: ${record.client_name}\nTelefone: ${record.client_phone}\nEndereço: ${record.client_address}\nEmpresa: ${record.client_company}\nServiço: ${record.service_description}\nValor: R$ ${record.service_value}\nGarantia: ${record.warranty_months} meses\nObservações: ${record.observations}\n${"=".repeat(50)}\n`,
      )
      .join("\n")

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Consulta_Clientes_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    console.log("[v0] Log baixado com sucesso")
  }

  const clearForm = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      company: "",
      service: "",
      value: "",
      warranty: "",
      observations: "",
      date: new Date().toLocaleDateString("pt-BR"),
    })
  }

  if (currentScreen === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
          <div className="text-center space-y-4">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Phone className="w-4 h-4 mr-2" />
              41 9 9805-5975
            </Badge>
            <h1 className="text-4xl font-bold text-primary">Geloterm Refrigeração</h1>
            <p className="text-muted-foreground">Sistema de Gestão de Serviços</p>
          </div>

          <div className="w-full max-w-md space-y-4">
            <Button onClick={() => setCurrentScreen("login")} className="w-full h-14 text-lg" size="lg">
              <Users className="w-5 h-5 mr-2" />
              Técnicos
            </Button>

            <Button
              onClick={() => setCurrentScreen("clients")}
              variant="secondary"
              className="w-full h-14 text-lg"
              size="lg"
            >
              <Search className="w-5 h-5 mr-2" />
              Clientes
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">© Copyright Geloterm</div>
        </div>
      </div>
    )
  }

  if (currentScreen === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Login de Técnico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {showAlert && showAlert.includes("Senha") && (
              <Alert variant="destructive">
                <AlertDescription>{showAlert}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha de Técnico</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Digite a senha"
              />
            </div>

            <div className="space-y-3">
              <Button onClick={handleLogin} className="w-full">
                Entrar
              </Button>
              <Button onClick={() => setCurrentScreen("home")} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentScreen === "technician") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Painel do Técnico</h1>
            <Button onClick={() => setCurrentScreen("home")} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          {showAlert && (
            <Alert className="border-accent text-accent-foreground">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>{showAlert}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Nova Nota de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cliente</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(41) 99999-9999"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Endereço completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="Nome da empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Valor</Label>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="service">Serviço Realizado</Label>
                  <Textarea
                    id="service"
                    value={formData.service}
                    onChange={(e) => setFormData((prev) => ({ ...prev, service: e.target.value }))}
                    placeholder="Descreva o serviço realizado"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warranty">Garantia</Label>
                  <Input
                    id="warranty"
                    value={formData.warranty}
                    onChange={(e) => setFormData((prev) => ({ ...prev, warranty: e.target.value }))}
                    placeholder="ex: 90 dias"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="date">Data do Serviço</Label>
                  <Input
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
                    placeholder="Observações adicionais"
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={generatePDF} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Salvar PDF + WhatsApp
                </Button>
                <Button onClick={clearForm} variant="outline">
                  Limpar Formulário
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (currentScreen === "clients") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Consultar Clientes</h1>
            <Button onClick={() => setCurrentScreen("home")} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {loading ? (
              "Carregando..."
            ) : (
              <>
                Total de registros salvos: {serviceRecords.length}
                {!supabaseAvailable && (
                  <Badge variant="outline" className="ml-2">
                    Modo Offline
                  </Badge>
                )}
                {supabaseAvailable && (
                  <Badge variant="outline" className="ml-2 bg-green-50">
                    Sincronizado
                  </Badge>
                )}
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Buscar Registros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-name">Nome do Cliente</Label>
                  <Input
                    id="search-name"
                    value={searchData.name}
                    onChange={(e) => setSearchData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome para buscar"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-phone">Telefone</Label>
                  <Input
                    id="search-phone"
                    value={searchData.phone}
                    onChange={(e) => setSearchData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Telefone para buscar"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-date">Data</Label>
                  <Input
                    id="search-date"
                    value={searchData.date}
                    onChange={(e) => setSearchData((prev) => ({ ...prev, date: e.target.value }))}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              </div>

              <Button onClick={searchClients} className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Resultados da Busca ({searchResults.length})</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={downloadResults} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Log
                  </Button>
                  <Button onClick={copyResults} variant="outline" size="sm">
                    {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {searchResults.map((record, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <strong>Data:</strong> {record.service_date}
                          </div>
                          <div>
                            <strong>Cliente:</strong> {record.client_name}
                          </div>
                          <div>
                            <strong>Telefone:</strong> {record.client_phone}
                          </div>
                          <div>
                            <strong>Empresa:</strong> {record.client_company}
                          </div>
                          <div className="md:col-span-2">
                            <strong>Serviço:</strong> {record.service_description}
                          </div>
                          <div>
                            <strong>Valor:</strong> R$ {record.service_value}
                          </div>
                          <div>
                            <strong>Garantia:</strong> {record.warranty_months} meses
                          </div>
                          {record.observations && (
                            <div className="md:col-span-2">
                              <strong>Observações:</strong> {record.observations}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {serviceRecords.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum registro encontrado. Crie algumas notas de serviço primeiro.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  return null
}
