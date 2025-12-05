import { useMemo, useState } from "react";
import { useReminders, LeaseReminder, usePaymentReminders, PaymentReminder } from "@/hooks/useReminders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Calendar, Clock, AlertTriangle, RefreshCcw, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString("fr-FR") : "—");

const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, " ").trim();

const applyTemplate = (template: string, reminder: LeaseReminder) => {
  const replacements: Record<string, string> = {
    tenant_name: reminder.tenant_name,
    property_title: reminder.property_title,
    property_city: reminder.property_city,
    end_date: formatDate(reminder.end_date),
    start_date: formatDate(reminder.start_date),
    days_until_end:
      reminder.days_until_end !== null ? reminder.days_until_end.toString() : "",
    rent_amount: reminder.rent_amount !== undefined ? reminder.rent_amount.toLocaleString("fr-FR") : "",
    pay_url: reminder.pay_url ?? "/payments",
  };

  return Object.entries(replacements).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "gi"), value ?? "");
  }, template);
};

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)
  : null;
const hasStripe = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function StripePayForm({
  clientSecret,
  amount,
  onSuccess,
  submitting,
  setSubmitting,
}: {
  clientSecret: string;
  amount?: number;
  onSuccess: () => void;
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      toast({
        title: "Paiement refusé",
        description: error.message ?? "Le paiement n'a pas abouti",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }
    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      toast({ title: "Paiement confirmé" });
      onSuccess();
    } else {
      toast({ title: "Paiement en attente", description: "Confirmation en cours." });
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="p-3 rounded-md border border-muted">
        <PaymentElement />
      </div>
      {amount !== undefined && (
        <p className="text-sm text-muted-foreground">
          Montant : <span className="font-semibold">{amount.toLocaleString("fr-FR")} F CFA</span>
        </p>
      )}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Paiement..." : "Payer"}
      </Button>
    </form>
  );
}

export default function Relances() {
  const { data: reminders = [], isLoading, isError, refetch } = useReminders();
  const { data: paymentReminders = [], isLoading: paymentsLoading, isError: paymentsError, refetch: refetchPaymentReminders } =
    usePaymentReminders();
  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      const aDate = a.end_date ? new Date(a.end_date).getTime() : Infinity;
      const bDate = b.end_date ? new Date(b.end_date).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [reminders]);
  const sortedPaymentReminders = useMemo(() => {
    return [...paymentReminders].sort((a, b) => {
      const aDate = new Date(a.due_date).getTime();
      const bDate = new Date(b.due_date).getTime();
      return aDate - bDate;
    });
  }, [paymentReminders]);

  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [paymentSendingId, setPaymentSendingId] = useState<number | null>(null);
  const [subjectTemplate, setSubjectTemplate] = useState("Fin de bail - {{property_title}}");
  const [htmlTemplate, setHtmlTemplate] = useState<string>(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relance fin de bail</title>
  <style>
    body { margin: 0; padding: 0; background-color: #eef2f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #eef2f5; padding-bottom: 40px; }
    .main-table { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #4a4a4a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background-color: #0f172a; padding: 25px; text-align: center; }
    .content { padding: 30px; }
    .info-box { background-color: #f0f7ff; border: 1px solid #cce5ff; border-radius: 4px; padding: 15px; margin: 20px 0; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee; }
    @media screen and (max-width: 600px) { .content { padding: 15px; } .main-table { width: 100% !important; } }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table" role="presentation">
      <tr>
        <td class="header">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">AVIS DE FIN DE BAIL</h1>
        </td>
      </tr>
      <tr>
        <td class="content">
          <p style="font-size: 16px; margin-bottom: 18px;">Bonjour {{tenant_name}},</p>
          <p style="line-height: 1.5;">
            Votre bail pour <strong>{{property_title}}</strong> ({{property_city}}) arrive à échéance le <strong>{{end_date}}</strong>.
          </p>
          <div class="info-box">
            <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
              <tr>
                <td style="border-bottom: 1px solid #e6eef8; color: #666;">Début du bail</td>
                <td align="right" style="border-bottom: 1px solid #e6eef8; font-weight: 600;">{{start_date}}</td>
              </tr>
              <tr>
                <td style="border-bottom: 1px solid #e6eef8; color: #666;">Fin prévue</td>
                <td align="right" style="border-bottom: 1px solid #e6eef8; font-weight: 600;">{{end_date}}</td>
              </tr>
              <tr>
                <td style="border-bottom: 1px solid #e6eef8; color: #666;">Loyer mensuel</td>
                <td align="right" style="border-bottom: 1px solid #e6eef8; font-weight: 600;">{{rent_amount}} F CFA</td>
              </tr>
              <tr>
                <td style="color: #666;">Temps restant</td>
                <td align="right" style="font-weight: 600;">{{days_until_end}} jour(s)</td>
              </tr>
            </table>
          </div>
          <p style="line-height: 1.5; color: #4a5568; font-size: 14px;">
            Merci de nous confirmer si vous souhaitez renouveler le bail ou organiser votre sortie du logement. Nous restons disponibles pour planifier un rendez-vous d’état des lieux.
          </p>
          <div style="text-align: center; margin-top: 24px;">
            <a href="{{pay_url}}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">Payer maintenant</a>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p style="margin: 0;">Ceci est un email automatique. Merci de répondre pour toute question.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
  );

  const previewReminder = sortedReminders[0];
  const previewHtml = previewReminder ? applyTemplate(htmlTemplate, previewReminder) : htmlTemplate;
  const previewSubject = previewReminder
    ? applyTemplate(subjectTemplate, previewReminder)
    : subjectTemplate;

  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeSubmitting, setStripeSubmitting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentReminder | null>(null);

  const sendReminder = async (reminder: LeaseReminder) => {
    const subject = applyTemplate(subjectTemplate, reminder);
    const html = applyTemplate(htmlTemplate, reminder);
    const plain = stripHtml(html);

    try {
      setSendingId(reminder.lease_id);
      await api.post(`/reminders/leases/${reminder.lease_id}/send`, {
        subject,
        html_content: html,
        plain_text_content: plain,
      });
      toast({
        title: "Relance envoyée",
        description: `Email envoyé à ${reminder.tenant_email}`,
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible d'envoyer la relance",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  const sendPaymentReminder = async (reminder: PaymentReminder) => {
    try {
      setPaymentSendingId(reminder.payment_id);
      await api.post(`/payments/${reminder.payment_id}/notice`);
      toast({
        title: "Relance paiement envoyée",
        description: `Email envoyé à ${reminder.tenant_email}`,
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible d'envoyer la relance paiement",
        variant: "destructive",
      });
    } finally {
      setPaymentSendingId(null);
    }
  };

  const openStripePayment = async (reminder: PaymentReminder) => {
    if (!hasStripe || !stripePromise) {
      toast({
        title: "Stripe non configuré",
        description: "Ajoutez VITE_STRIPE_PUBLISHABLE_KEY pour le paiement en ligne.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSelectedPayment(reminder);
      setStripeSubmitting(false);
      const res = await api.post(`/payments/${reminder.payment_id}/intent`);
      setStripeClientSecret(res.data.client_secret ?? null);
      setStripeModalOpen(true);
    } catch (err: any) {
      toast({
        title: "Paiement impossible",
        description: err.response?.data?.detail || "Stripe n'a pas pu créer l'intention de paiement",
        variant: "destructive",
      });
    }
  };

  const handleStripeSuccess = () => {
    setStripeSubmitting(false);
    setStripeModalOpen(false);
    setSelectedPayment(null);
    setStripeClientSecret(null);
    refetchPaymentReminders();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header mb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Relances</h1>
          <p className="page-subtitle">Baux (expiration) et paiements (échéance), du plus proche au plus lointain</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetch();
            refetchPaymentReminders();
          }}
          className="gap-2"
        >
          <RefreshCcw size={16} />
          Rafraîchir
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground">Composer le message</h3>
            <p className="text-sm text-muted-foreground">
              Placeholders disponibles : {"{{tenant_name}}"}, {"{{property_title}}"}, {"{{property_city}}"},
              {"{{end_date}}"}, {"{{start_date}}"}, {"{{days_until_end}}"}, {"{{rent_amount}}"}, {"{{pay_url}}"}.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Objet</label>
              <Input
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                placeholder="Objet de l'email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Corps (HTML/CSS)</label>
              <Textarea
                value={htmlTemplate}
                onChange={(e) => setHtmlTemplate(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Aperçu (avec le bail le plus proche)</p>
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Objet : {previewSubject}</p>
                <div
                  className="border rounded-md p-3 bg-muted/30"
                  dangerouslySetInnerHTML={{ __html: previewHtml || "<p>Prévisualisation</p>" }}
                />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground text-lg">Paiements à relancer (Stripe)</h2>
            <p className="text-sm text-muted-foreground">
              Triés du plus urgent au moins urgent. Envoi d&apos;email + bouton de paiement Stripe.
            </p>
          </div>
        </div>

        {paymentsLoading && <p className="text-muted-foreground">Chargement des paiements...</p>}
        {paymentsError && (
          <p className="text-destructive">
            Impossible de charger les paiements à relancer.{" "}
            <button className="underline" onClick={() => refetchPaymentReminders()}>
              Réessayer
            </button>
          </p>
        )}

        {!paymentsLoading && !paymentsError && sortedPaymentReminders.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Aucun paiement à relancer pour le moment.
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedPaymentReminders.map((reminder) => {
            const isLate = reminder.status === "late";
            const label =
              reminder.days_until_due < 0
                ? `En retard de ${Math.abs(reminder.days_until_due)} jour(s)`
                : `Échéance dans ${reminder.days_until_due} jour(s)`;
            return (
              <Card key={reminder.payment_id} className="hover:shadow-card-hover transition-all duration-300">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{reminder.property_title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {reminder.tenant_name} — {reminder.tenant_email}
                      </p>
                    </div>
                    <span className={isLate ? "badge-destructive" : "badge-warning"}>
                      {isLate ? "En retard" : "À venir"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Échéance {formatDate(reminder.due_date)}</span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {reminder.amount.toLocaleString("fr-FR")} F CFA
                    </span>
                  </div>
                  <p className={`text-sm ${isLate ? "text-destructive" : "text-muted-foreground"}`}>{label}</p>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="secondary"
                      className="gap-2"
                      onClick={() => sendPaymentReminder(reminder)}
                      disabled={paymentSendingId === reminder.payment_id}
                    >
                      <Mail size={16} />
                      {paymentSendingId === reminder.payment_id ? "Envoi..." : "Relancer par mail"}
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => openStripePayment(reminder)}
                      disabled={paymentSendingId === reminder.payment_id}
                    >
                      <CreditCard size={16} />
                      Payer (Stripe)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-foreground text-lg">Fin de bail à surveiller</h2>
        <p className="text-sm text-muted-foreground">Triées par date de fin (du plus proche au plus lointain).</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Chargement des baux...</p>}
      {isError && (
        <p className="text-destructive">
          Impossible de charger les relances.{" "}
          <button className="underline" onClick={() => refetch()}>
            Réessayer
          </button>
        </p>
      )}

      {!isLoading && !isError && sortedReminders.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun bail avec date de fin pour le moment.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedReminders.map((reminder) => {
          const days = reminder.days_until_end ?? 0;
          const isPast = days < 0;
          const isSoon = days <= 30;
          const StatusIcon = isPast ? AlertTriangle : Clock;
          return (
            <Card key={reminder.lease_id} className="hover:shadow-card-hover transition-all duration-300">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon size={18} className={isPast ? "text-destructive" : "text-warning"} />
                    <span className="text-sm font-medium">
                      {isPast ? "Bail expiré" : isSoon ? "Expire bientôt" : "En cours"} — fin le{" "}
                      {formatDate(reminder.end_date)}
                    </span>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                    {reminder.property_city}
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground">{reminder.property_title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar size={14} />
                    Début {formatDate(reminder.start_date)} — Fin {formatDate(reminder.end_date)}
                  </p>
                  <p className="text-sm text-muted-foreground">{reminder.tenant_name} — {reminder.tenant_email}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isPast
                        ? `${Math.abs(days)} jour(s) depuis l'expiration`
                        : `Expire dans ${days} jour(s)`}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => sendReminder(reminder)}
                    disabled={sendingId === reminder.lease_id}
                  >
                    <Mail size={16} />
                    {sendingId === reminder.lease_id ? "Envoi..." : "Envoyer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={stripeModalOpen}
        onOpenChange={(open) => {
          setStripeModalOpen(open);
          if (!open) {
            setStripeClientSecret(null);
            setSelectedPayment(null);
            setStripeSubmitting(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Paiement Stripe</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="text-sm text-muted-foreground mb-2 space-y-1">
              <p>
                {selectedPayment.property_title} — {selectedPayment.property_city}
              </p>
              <p>
                Échéance {formatDate(selectedPayment.due_date)} ·{" "}
                <span className="font-semibold text-foreground">
                  {selectedPayment.amount.toLocaleString("fr-FR")} F CFA
                </span>
              </p>
            </div>
          )}
          {stripeClientSecret && stripePromise ? (
            <Elements options={{ clientSecret: stripeClientSecret }} stripe={stripePromise}>
              <StripePayForm
                clientSecret={stripeClientSecret}
                amount={selectedPayment?.amount}
                submitting={stripeSubmitting}
                setSubmitting={setStripeSubmitting}
                onSuccess={handleStripeSuccess}
              />
            </Elements>
          ) : (
            <p className="text-sm text-muted-foreground">
              Impossible de charger Stripe. Vérifiez la clé publique.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
