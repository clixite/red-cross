import { SupportedLanguage } from '@sfs/domain';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';

export interface NotificationPayload {
  recipientEmail: string;
  recipientName: string;
  language: SupportedLanguage;
  type: 'COMPLAINT_RECEIVED_ACK' | 'STATUS_CHANGED' | 'ADDITIONAL_INFO_REQUESTED' | 'USER_INVITATION' | 'SURVEY_INVITATION';
  data: Record<string, string | number>;
}

export class NotificationService {
  private static TEMPLATES: Record<
    SupportedLanguage,
    Record<NotificationPayload['type'], (data: any) => { subject: string; body: string }>
  > = {
    [SupportedLanguage.FR]: {
      COMPLAINT_RECEIVED_ACK: (d) => ({
        subject: `[Service du Sang] Accusé de réception - Réclamation ${d.portalNumber}`,
        body: `Bonjour ${d.recipientName},\n\nNous accusons bonne réception de votre réclamation enregistrée sous la référence ${d.portalNumber}.\nNotre équipe qualité procède actuellement à l analyse de recevabilité conformément à nos engagements de service (délai cible : ${d.slaReceivabilityDate || '2 jours ouvrés'}).\n\nVous pouvez suivre l avancement de votre dossier sur votre espace client : ${config.port}\n\nCordialement,\nLe Service Qualité - Service du Sang`,
      }),
      STATUS_CHANGED: (d) => ({
        subject: `[Service du Sang] Mise à jour - Réclamation ${d.portalNumber} (${d.newStatus})`,
        body: `Bonjour ${d.recipientName},\n\nLe statut de votre réclamation ${d.portalNumber} a été mis à jour : ${d.newStatus}.\n${d.comment ? `Commentaire : ${d.comment}\n` : ''}\nConsultez les détails sur le portail : ${config.port}\n\nService Qualité`,
      }),
      ADDITIONAL_INFO_REQUESTED: (d) => ({
        subject: `[Service du Sang] Action requise : Demande d information complémentaire - ${d.portalNumber}`,
        body: `Bonjour ${d.recipientName},\n\nDes informations complémentaires sont nécessaires pour poursuivre l investigation de votre dossier ${d.portalNumber}.\n\nMessage de l agent qualité :\n"${d.message}"\n\nMerci de répondre directement dans le fil d échange du portail pour relancer l instruction du dossier.\n\nService Qualité`,
      }),
      USER_INVITATION: (d) => ({
        subject: `[Service du Sang] Invitation à rejoindre le portail clients qualité`,
        body: `Bonjour ${d.recipientName},\n\nVous avez été invité(e) par votre référent à rejoindre le portail B2B du Service du Sang pour l organisation ${d.organizationName}.\n\nPour activer votre compte et définir votre mot de passe, cliquez sur ce lien sécurisé (valide 72h) :\n${d.activationUrl}\n\nService Qualité`,
      }),
      SURVEY_INVITATION: (d) => ({
        subject: `[Service du Sang] Votre avis compte : Clôture de la réclamation ${d.portalNumber}`,
        body: `Bonjour ${d.recipientName},\n\nVotre réclamation ${d.portalNumber} est désormais clôturée.\nAfin d améliorer constamment la qualité de nos produits et services, nous vous invitons à répondre à une courte enquête de satisfaction (30 secondes) :\n${d.surveyUrl}\n\nNous vous remercions de votre confiance.\nLe Service Qualité`,
      }),
    },

    [SupportedLanguage.NL]: {
      COMPLAINT_RECEIVED_ACK: (d) => ({
        subject: `[Bloeddienst] Ontvangstbevestiging - Klacht ${d.portalNumber}`,
        body: `Geachte ${d.recipientName},\n\nWij hebben uw klacht met referentie ${d.portalNumber} goed ontvangen.\nOns kwaliteitsteam start de analyse conform onze servicetermijnen.\n\nMet vriendelijke groet,\nDe Kwaliteitsdienst - Bloeddienst`,
      }),
      STATUS_CHANGED: (d) => ({
        subject: `[Bloeddienst] Update - Klacht ${d.portalNumber} (${d.newStatus})`,
        body: `Geachte ${d.recipientName},\n\nDe status van uw klacht ${d.portalNumber} is gewijzigd naar: ${d.newStatus}.\n\nKwaliteitsdienst`,
      }),
      ADDITIONAL_INFO_REQUESTED: (d) => ({
        subject: `[Bloeddienst] Actie vereist: Aanvullende informatie gevraagd - ${d.portalNumber}`,
        body: `Geachte ${d.recipientName},\n\nEr is aanvullende informatie nodig om het onderzoek voor ${d.portalNumber} voort te zetten.\n\nKwaliteitsdienst`,
      }),
      USER_INVITATION: (d) => ({
        subject: `[Bloeddienst] Uitnodiging voor het B2B klantenportaal`,
        body: `Geachte ${d.recipientName},\n\nU bent uitgenodigd voor het klantenportaal van de Bloeddienst voor ${d.organizationName}.\nActivatielink: ${d.activationUrl}\n\nKwaliteitsdienst`,
      }),
      SURVEY_INVITATION: (d) => ({
        subject: `[Bloeddienst] Uw mening telt: Afsluiting klacht ${d.portalNumber}`,
        body: `Geachte ${d.recipientName},\n\nUw klacht ${d.portalNumber} is afgesloten. Gelieve onze korte tevredenheidsenquête in te vullen: ${d.surveyUrl}\n\nKwaliteitsdienst`,
      }),
    },

    [SupportedLanguage.EN]: {
      COMPLAINT_RECEIVED_ACK: (d) => ({
        subject: `[Blood Service] Acknowledgment of receipt - Complaint ${d.portalNumber}`,
        body: `Dear ${d.recipientName},\n\nWe acknowledge receipt of your complaint registered under reference ${d.portalNumber}.\nOur quality team is currently evaluating its admissibility.\n\nBest regards,\nQuality Service - Blood Service`,
      }),
      STATUS_CHANGED: (d) => ({
        subject: `[Blood Service] Status update - Complaint ${d.portalNumber} (${d.newStatus})`,
        body: `Dear ${d.recipientName},\n\nThe status of your complaint ${d.portalNumber} has been updated to: ${d.newStatus}.\n\nQuality Service`,
      }),
      ADDITIONAL_INFO_REQUESTED: (d) => ({
        subject: `[Blood Service] Action required: Additional information requested - ${d.portalNumber}`,
        body: `Dear ${d.recipientName},\n\nAdditional information is required for complaint ${d.portalNumber}.\n\nQuality Service`,
      }),
      USER_INVITATION: (d) => ({
        subject: `[Blood Service] Invitation to join the Quality Client Portal`,
        body: `Dear ${d.recipientName},\n\nYou have been invited to join the Blood Service Quality Portal for ${d.organizationName}.\nActivation link: ${d.activationUrl}\n\nQuality Service`,
      }),
      SURVEY_INVITATION: (d) => ({
        subject: `[Blood Service] Your feedback matters: Complaint ${d.portalNumber} closed`,
        body: `Dear ${d.recipientName},\n\nYour complaint ${d.portalNumber} is now closed. Please take 30 seconds to fill out our satisfaction survey: ${d.surveyUrl}\n\nQuality Service`,
      }),
    },
  };

  public static async send(payload: NotificationPayload): Promise<void> {
    const lang = payload.language || SupportedLanguage.FR;
    const langTemplates = this.TEMPLATES[lang] || this.TEMPLATES[SupportedLanguage.FR];
    const templateFn = langTemplates[payload.type];

    const { subject, body } = templateFn(payload.data);

    try {
      await prisma.notificationLog.create({
        data: {
          recipientEmail: payload.recipientEmail,
          recipientName: payload.recipientName,
          language: lang as any,
          subject,
          bodyText: body,
          status: 'SENT',
        },
      });

      console.log(`[EMAIL_NOTIFICATION] [${lang.toUpperCase()}] -> ${payload.recipientEmail} | Subject: ${subject}`);
    } catch (err) {
      console.warn(`[EMAIL_NOTIFICATION] Erreur log notification:`, err);
    }
  }
}
