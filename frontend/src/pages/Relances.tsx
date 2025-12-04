import { useMemo, useState } from "react";
import { useReminders, LeaseReminder } from "@/hooks/useReminders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Calendar, Clock, AlertTriangle, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

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
  };

  return Object.entries(replacements).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "gi"), value ?? "");
  }, template);
};

export default function Relances() {
  const { data: reminders = [], isLoading, isError, refetch } = useReminders();
  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      const aDate = a.end_date ? new Date(a.end_date).getTime() : Infinity;
      const bDate = b.end_date ? new Date(b.end_date).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [reminders]);

  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<number | null>(null);
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
                <td style="color: #666;">Temps restant</td>
                <td align="right" style="font-weight: 600;">{{days_until_end}} jour(s)</td>
              </tr>
            </table>
          </div>
          <p style="line-height: 1.5; color: #4a5568; font-size: 14px;">
            Merci de nous confirmer si vous souhaitez renouveler le bail ou organiser votre sortie du logement. Nous restons disponibles pour planifier un rendez-vous d’état des lieux.
          </p>
          <div style="text-align: center; margin-top: 24px;">
            <a href="#" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">Contact propriétaire</a>
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header mb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Relances de fin de bail</h1>
          <p className="page-subtitle">Classées du plus proche au plus lointain, envoi via SendGrid</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
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
              {"{{end_date}}"}, {"{{start_date}}"}, {"{{days_until_end}}"}.
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
    </div>
  );
}
