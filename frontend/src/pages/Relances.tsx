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
    `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
  <p>Bonjour {{tenant_name}},</p>
  <p>Votre bail pour <strong>{{property_title}}</strong> arrive à échéance le <strong>{{end_date}}</strong>.</p>
  <p>Merci de prendre contact pour organiser un renouvellement ou la sortie du logement.</p>
  <p style="font-size: 12px; color: #666;">Ville : {{property_city}} — J-{{days_until_end}}</p>
</div>`
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
