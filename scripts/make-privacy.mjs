// Builds translated copies of the privacy policy from the English page.
//
//   node scripts/make-privacy.mjs
//
// Reads public/privacy/index.html (English, the authoritative text) and writes
// public/privacy/<lang>/index.html. Edit the English page first, then update the
// strings below and re-run. The quoted button names must match the app's own labels
// (src/i18n/<lang>.ts: amb.use and amb.auto).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = readFileSync(join(root, 'public/privacy/index.html'), 'utf8');
const head = en.slice(0, en.indexOf('<body>'));

const L = {
  tr: {
    title: 'Gizlilik politikası - Makarna ve Erişte Hesaplayıcısı',
    desc: 'Makarna ve Erişte Hesaplayıcısı uygulaması ve web sitesi için gizlilik politikası.',
    back: 'Hesaplayıcıya dön',
    h1: 'Gizlilik politikası',
    meta: 'Makarna ve Erişte Hesaplayıcısı (Android uygulaması ve pasta.sourdoughcalculator.uk web sitesi). Son güncelleme: 31 Ekim 2026.',
    note: 'Bu, İngilizce gizlilik politikasının bir çevirisidir. Herhangi bir fark olursa İngilizce sürüm geçerlidir:',
    noteLink: 'İngilizce sürüm',
    short: ['Kısaca', 'Hesap yok, reklam yok, analiz yok, takip yok. Girdiğiniz her şey cihazınızda kalır. Cihazınızdan bir şeyin çıktığı tek an yerel sıcaklığı istediğiniz zamandır ve o zaman da yalnızca yuvarlanmış koordinatlar gönderilir.'],
    sections: [
      ['Cihazınızda neler saklanır', '<p>Hesaplayıcı ayarlarınız, tuttuğunuz parti günlüğü ve kalibrasyon sonuçlarınız, cihazınızdaki tarayıcının yerel depolamasına kaydedilir (Android uygulaması aynı web sitesinin bir sarmalayıcısıdır ve aynı depolamayı kullanır). Bunların bir kopyası bizde yoktur ve göremeyiz. JSON dosyası olarak dışa aktarabilir, geri içe aktarabilir veya Android ayarlarından uygulamanın depolamasını temizleyerek silebilirsiniz.</p>'],
      ['Konum (isteğe bağlı)', '<p>Hesaplayıcı, hamur dinlenme süresini ayarlamak için dış hava sıcaklığını sorgulayabilir. Bu yalnızca «Konumumu kullan» düğmesine dokunursanız ya da «Uygulamayı açtığımda otomatik algıla» kutusunu işaretlediyseniz gerçekleşir. Cihazınız bunun üzerine yaklaşık konumu paylaşmak için izninizi ister.</p><ul><li>Enleminiz ve boylamınız cihazınızda yaklaşık 1 km\'ye yuvarlanır, ardından güncel sıcaklığı almak için <a href="https://open-meteo.com/">Open-Meteo</a>\'ya (api.open-meteo.com) gönderilir. Open-Meteo ücretsiz bir hava durumu servisidir; isteklerinizi nasıl işlediği için kendi gizlilik politikasına bakın.</li><li>Başka hiçbir şey gönderilmez: bizim eklediğimiz bir tanımlayıcı, hesap veya cihaz bilgisi yoktur. Her web isteği gibi Open-Meteo da IP adresinizi alır.</li><li>Konum bizim tarafımızdan saklanmaz ve uygulama koordinatlarınızı değil, yalnızca dönen sıcaklığı tutar.</li><li>Reddederseniz veya çevrimdışıysanız sıcaklığı kendiniz yazarsınız. Uygulamada başka hiçbir şey konuma ihtiyaç duymaz.</li></ul>'],
      ['Sunucularımız', '<p>Web sitesi Cloudflare tarafından barındırılır. Her web barındırıcısı gibi Cloudflare da sayfaları iletmek için IP adresinizi ve istek ayrıntılarını işler ve standart sunucu günlükleri tutabilir. Analiz çalıştırmayız, çerez kullanmayız ve bunların hiçbirini başka verilerle birleştirmeyiz. Uygulama yüklendikten sonra çevrimdışı çalışır.</p>'],
      ['Çocuklar', '<p>Uygulama bir mutfak hesaplayıcısıdır ve çocuklara yönelik değildir. Hiç kimseden kişisel bilgi toplamaz.</p>'],
      ['Paylaşım ve satış', '<p>Verilerinizi satmayız veya paylaşmayız ve reklam için kullanmayız. Dahil olan tek üçüncü taraf Open-Meteo\'dur; yalnızca yukarıda anlatıldığı şekilde ve yalnızca siz sıcaklığı istediğinizde.</p>'],
      ['Değişiklikler', '<p>Bu politika değişirse, yeni sürüm yeni bir tarihle burada yayımlanır.</p>'],
      ['İletişim', '<p>Sorular veya talepler için: <a href="mailto:info@sourdoughcalculator.uk">info@sourdoughcalculator.uk</a>.</p>'],
    ],
  },
  de: {
    title: 'Datenschutzerklärung - Pasta- und Nudelteig-Rechner',
    desc: 'Datenschutzerklärung für die App und Website Pasta- und Nudelteig-Rechner.',
    back: 'Zurück zum Rechner',
    h1: 'Datenschutzerklärung',
    meta: 'Pasta- und Nudelteig-Rechner (Android-App und Website unter pasta.sourdoughcalculator.uk). Zuletzt aktualisiert am 31. Oktober 2026.',
    note: 'Dies ist eine Übersetzung der englischen Datenschutzerklärung. Bei Abweichungen gilt die englische Fassung:',
    noteLink: 'englische Fassung',
    short: ['Die Kurzfassung', 'Kein Konto, keine Werbung, keine Analyse, kein Tracking. Alles, was Sie eingeben, bleibt auf Ihrem Gerät. Nur wenn Sie die örtliche Temperatur abfragen, verlässt etwas Ihr Gerät, und dann werden ausschließlich gerundete Koordinaten gesendet.'],
    sections: [
      ['Was auf Ihrem Gerät gespeichert wird', '<p>Ihre Rechnereinstellungen, das von Ihnen geführte Ansatzprotokoll und Ihre Kalibrierungsergebnisse werden im lokalen Speicher Ihres Browsers auf Ihrem Gerät abgelegt (die Android-App ist eine Hülle um dieselbe Website und nutzt denselben Speicher). Wir haben keine Kopie davon und können sie nicht einsehen. Sie können die Daten als JSON-Datei exportieren, wieder importieren oder löschen, indem Sie in den Android-Einstellungen den Speicher der App leeren.</p>'],
      ['Standort (optional)', '<p>Der Rechner kann die Außentemperatur abrufen, um die Ruhezeit des Teigs anzupassen. Das geschieht nur, wenn Sie auf „Meinen Standort verwenden“ tippen oder „Beim Öffnen der App automatisch ermitteln“ angekreuzt haben. Ihr Gerät fragt dann um Erlaubnis, einen ungefähren Standort zu teilen.</p><ul><li>Ihr Breiten- und Längengrad werden auf Ihrem Gerät auf etwa 1 km gerundet und dann an <a href="https://open-meteo.com/">Open-Meteo</a> (api.open-meteo.com) gesendet, um die aktuelle Temperatur abzurufen. Open-Meteo ist ein kostenloser Wetterdienst; wie er Anfragen behandelt, steht in seiner eigenen Datenschutzerklärung.</li><li>Es wird nichts anderes gesendet: keine Kennung, kein Konto, keine von uns hinzugefügten Gerätedaten. Wie bei jeder Webanfrage erhält Open-Meteo Ihre IP-Adresse.</li><li>Der Standort wird von uns nicht gespeichert, und die App behält nur die zurückgelieferte Temperatur, nicht Ihre Koordinaten.</li><li>Wenn Sie ablehnen oder offline sind, geben Sie die Temperatur einfach selbst ein. Nichts anderes in der App braucht den Standort.</li></ul>'],
      ['Unsere Server', '<p>Die Website wird von Cloudflare gehostet. Wie jeder Webhoster verarbeitet Cloudflare Ihre IP-Adresse und Anfragedetails, um die Seiten auszuliefern, und kann übliche Serverprotokolle führen. Wir betreiben keine Analyse, setzen keine Cookies und verknüpfen nichts davon mit anderen Daten. Sobald die App geladen ist, funktioniert sie offline.</p>'],
      ['Kinder', '<p>Die App ist ein Küchenrechner und richtet sich nicht an Kinder. Sie erhebt von niemandem personenbezogene Daten.</p>'],
      ['Weitergabe und Verkauf', '<p>Wir verkaufen oder teilen Ihre Daten nicht und verwenden sie nicht für Werbung. Der einzige beteiligte Dritte ist Open-Meteo, nur wie oben beschrieben und nur, wenn Sie die Temperatur abfragen.</p>'],
      ['Änderungen', '<p>Ändert sich diese Erklärung, wird die neue Fassung mit neuem Datum hier veröffentlicht.</p>'],
      ['Kontakt', '<p>Fragen oder Anliegen: <a href="mailto:info@sourdoughcalculator.uk">info@sourdoughcalculator.uk</a>.</p>'],
    ],
  },
  es: {
    title: 'Política de privacidad - Calculadora de masa de pasta y fideos',
    desc: 'Política de privacidad de la app y el sitio web Calculadora de masa de pasta y fideos.',
    back: 'Volver a la calculadora',
    h1: 'Política de privacidad',
    meta: 'Calculadora de masa de pasta y fideos (app de Android y sitio web en pasta.sourdoughcalculator.uk). Última actualización: 31 de octubre de 2026.',
    note: 'Esta es una traducción de la política de privacidad en inglés. Si hay alguna diferencia, prevalece la versión en inglés:',
    noteLink: 'versión en inglés',
    short: ['La versión corta', 'Sin cuenta, sin anuncios, sin analíticas, sin seguimiento. Todo lo que introduce se queda en su dispositivo. Lo único que sale de él es cuando pide la temperatura local, y entonces solo se envían coordenadas redondeadas.'],
    sections: [
      ['Qué se guarda en su dispositivo', '<p>Los ajustes de su calculadora, el registro de tandas que lleva y sus resultados de calibración se guardan en el almacenamiento local del navegador de su dispositivo (la app de Android es un envoltorio del mismo sitio web y usa el mismo almacenamiento). No tenemos copia y no podemos verlos. Puede exportarlos como archivo JSON, volver a importarlos o borrarlos vaciando el almacenamiento de la app en los ajustes de Android.</p>'],
      ['Ubicación (opcional)', '<p>La calculadora puede consultar la temperatura exterior para ajustar el tiempo de reposo de la masa. Esto solo ocurre si toca «Usar mi ubicación» o si ha marcado «Detectar automáticamente al abrir la app». Su dispositivo le pedirá entonces permiso para compartir una ubicación aproximada.</p><ul><li>Su latitud y longitud se redondean a unos 1 km en su dispositivo y luego se envían a <a href="https://open-meteo.com/">Open-Meteo</a> (api.open-meteo.com) para obtener la temperatura actual. Open-Meteo es un servicio meteorológico gratuito; consulte su propia política de privacidad para saber cómo trata las solicitudes.</li><li>No se envía nada más: ningún identificador, ninguna cuenta, ningún dato del dispositivo que añadamos nosotros. Como cualquier solicitud web, Open-Meteo recibe su dirección IP.</li><li>Nosotros no guardamos la ubicación, y la app solo conserva la temperatura recibida, no sus coordenadas.</li><li>Si la rechaza o no tiene conexión, simplemente escriba usted la temperatura. Nada más en la app necesita la ubicación.</li></ul>'],
      ['Nuestros servidores', '<p>El sitio web está alojado en Cloudflare. Como cualquier proveedor de alojamiento, Cloudflare trata su dirección IP y los detalles de la solicitud para servir las páginas y puede conservar registros de servidor estándar. No ejecutamos analíticas ni usamos cookies, y no combinamos nada de esto con otros datos. Una vez cargada, la app funciona sin conexión.</p>'],
      ['Menores', '<p>La app es una calculadora de cocina y no está dirigida a menores. No recoge información personal de nadie.</p>'],
      ['Compartir y vender', '<p>No vendemos ni compartimos sus datos y no los usamos para publicidad. El único tercero implicado es Open-Meteo, solo como se describe arriba y solo cuando usted pide la temperatura.</p>'],
      ['Cambios', '<p>Si esta política cambia, la nueva versión se publicará aquí con una nueva fecha.</p>'],
      ['Contacto', '<p>Preguntas o solicitudes: <a href="mailto:info@sourdoughcalculator.uk">info@sourdoughcalculator.uk</a>.</p>'],
    ],
  },
  fr: {
    title: 'Politique de confidentialité - Calculateur de pâte à pâtes et nouilles',
    desc: "Politique de confidentialité de l'appli et du site Calculateur de pâte à pâtes et nouilles.",
    back: 'Retour au calculateur',
    h1: 'Politique de confidentialité',
    meta: 'Calculateur de pâte à pâtes et nouilles (appli Android et site web pasta.sourdoughcalculator.uk). Dernière mise à jour : 31 octobre 2026.',
    note: "Ceci est une traduction de la politique de confidentialité en anglais. En cas de différence, la version anglaise prévaut :",
    noteLink: 'version anglaise',
    short: ['En bref', "Pas de compte, pas de publicité, pas d'analyses, pas de suivi. Tout ce que vous saisissez reste sur votre appareil. Rien ne le quitte, sauf quand vous demandez la température locale, et seules des coordonnées arrondies sont alors envoyées."],
    sections: [
      ["Ce qui est stocké sur votre appareil", "<p>Les réglages de votre calculateur, le journal des fournées que vous tenez et vos résultats de calibrage sont enregistrés dans le stockage local du navigateur de votre appareil (l'appli Android est une enveloppe autour du même site web et utilise le même stockage). Nous n'en avons aucune copie et ne pouvons pas les voir. Vous pouvez les exporter en fichier JSON, les réimporter ou les supprimer en vidant le stockage de l'appli dans les réglages d'Android.</p>"],
      ['Position (facultatif)', "<p>Le calculateur peut chercher la température extérieure pour ajuster le temps de repos de la pâte. Cela n'arrive que si vous touchez « Utiliser ma position » ou si vous avez coché « Détecter automatiquement à l'ouverture de l'appli ». Votre appareil vous demande alors la permission de partager une position approximative.</p><ul><li>Votre latitude et votre longitude sont arrondies à environ 1 km sur votre appareil, puis envoyées à <a href=\"https://open-meteo.com/\">Open-Meteo</a> (api.open-meteo.com) pour obtenir la température actuelle. Open-Meteo est un service météo gratuit ; consultez sa propre politique de confidentialité pour savoir comment il traite les requêtes.</li><li>Rien d'autre n'est envoyé : aucun identifiant, aucun compte, aucune information d'appareil que nous ajouterions. Comme pour toute requête web, Open-Meteo reçoit votre adresse IP.</li><li>La position n'est pas stockée par nous, et l'appli ne conserve que la température reçue, pas vos coordonnées.</li><li>Si vous refusez, ou si vous êtes hors ligne, saisissez simplement la température vous-même. Rien d'autre dans l'appli n'a besoin de la position.</li></ul>"],
      ['Nos serveurs', "<p>Le site web est hébergé par Cloudflare. Comme tout hébergeur, Cloudflare traite votre adresse IP et les détails de la requête pour servir les pages et peut conserver des journaux de serveur standard. Nous n'utilisons ni analyses ni cookies, et nous ne croisons rien de tout cela avec d'autres données. Une fois chargée, l'appli fonctionne hors ligne.</p>"],
      ['Enfants', "<p>L'appli est un calculateur de cuisine et ne s'adresse pas aux enfants. Elle ne collecte aucune information personnelle, auprès de qui que ce soit.</p>"],
      ['Partage et vente', "<p>Nous ne vendons ni ne partageons vos données et ne les utilisons pas à des fins publicitaires. Le seul tiers concerné est Open-Meteo, uniquement comme décrit ci-dessus et uniquement lorsque vous demandez la température.</p>"],
      ['Modifications', "<p>Si cette politique change, la nouvelle version sera publiée ici avec une nouvelle date.</p>"],
      ['Contact', '<p>Questions ou demandes : <a href="mailto:info@sourdoughcalculator.uk">info@sourdoughcalculator.uk</a>.</p>'],
    ],
  },
  it: {
    title: 'Informativa sulla privacy - Calcolatore per impasti di pasta e noodles',
    desc: "Informativa sulla privacy dell'app e del sito Calcolatore per impasti di pasta e noodles.",
    back: 'Torna al calcolatore',
    h1: 'Informativa sulla privacy',
    meta: "Calcolatore per impasti di pasta e noodles (app Android e sito web pasta.sourdoughcalculator.uk). Ultimo aggiornamento: 31 ottobre 2026.",
    note: "Questa è una traduzione dell'informativa sulla privacy in inglese. In caso di differenze, prevale la versione inglese:",
    noteLink: 'versione inglese',
    short: ['In breve', "Nessun account, nessuna pubblicità, nessuna analisi, nessun tracciamento. Tutto ciò che inserisci resta sul tuo dispositivo. L'unico momento in cui qualcosa lo lascia è quando chiedi la temperatura locale, e allora vengono inviate solo coordinate arrotondate."],
    sections: [
      ['Cosa viene salvato sul tuo dispositivo', "<p>Le impostazioni del calcolatore, il registro impasti che tieni e i risultati di calibrazione vengono salvati nella memoria locale del browser del tuo dispositivo (l'app Android è un involucro dello stesso sito web e usa la stessa memoria). Non ne abbiamo alcuna copia e non possiamo vederli. Puoi esportarli come file JSON, reimportarli o eliminarli svuotando la memoria dell'app nelle impostazioni di Android.</p>"],
      ['Posizione (facoltativa)', "<p>Il calcolatore può cercare la temperatura esterna per regolare il tempo di riposo dell'impasto. Ciò avviene solo se tocchi «Usa la mia posizione» o se hai spuntato «Rileva automaticamente quando apro l'app». Il tuo dispositivo ti chiede allora il permesso di condividere una posizione approssimativa.</p><ul><li>Latitudine e longitudine vengono arrotondate a circa 1 km sul tuo dispositivo e poi inviate a <a href=\"https://open-meteo.com/\">Open-Meteo</a> (api.open-meteo.com) per ottenere la temperatura attuale. Open-Meteo è un servizio meteo gratuito; consulta la sua informativa sulla privacy per sapere come tratta le richieste.</li><li>Non viene inviato altro: nessun identificativo, nessun account, nessun dato del dispositivo aggiunto da noi. Come ogni richiesta web, Open-Meteo riceve il tuo indirizzo IP.</li><li>La posizione non viene memorizzata da noi e l'app conserva solo la temperatura ricevuta, non le tue coordinate.</li><li>Se rifiuti, o sei offline, ti basta scrivere tu la temperatura. Nient'altro nell'app richiede la posizione.</li></ul>"],
      ['I nostri server', "<p>Il sito web è ospitato da Cloudflare. Come ogni servizio di hosting, Cloudflare tratta il tuo indirizzo IP e i dettagli della richiesta per consegnare le pagine e può conservare i normali log del server. Non usiamo analisi né cookie e non colleghiamo nulla di tutto ciò ad altri dati. Una volta caricata, l'app funziona offline.</p>"],
      ['Minori', "<p>L'app è un calcolatore da cucina e non è rivolta ai minori. Non raccoglie informazioni personali da nessuno.</p>"],
      ['Condivisione e vendita', "<p>Non vendiamo né condividiamo i tuoi dati e non li usiamo per la pubblicità. L'unica terza parte coinvolta è Open-Meteo, solo come descritto sopra e solo quando chiedi la temperatura.</p>"],
      ['Modifiche', "<p>Se questa informativa cambia, la nuova versione sarà pubblicata qui con una nuova data.</p>"],
      ['Contatti', '<p>Domande o richieste: <a href="mailto:info@sourdoughcalculator.uk">info@sourdoughcalculator.uk</a>.</p>'],
    ],
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

for (const [lang, x] of Object.entries(L)) {
  const h = head
    .replace('<html lang="en">', `<html lang="${lang}">`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(x.desc)}" />`)
    .replace('href="../icons/icon-192.png"', 'href="../../icons/icon-192.png"')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(x.title)}</title>`);
  const body = `<body>
    <header><p><a href="../../">&larr; ${esc(x.back)}</a></p></header>
    <main>
      <h1>${esc(x.h1)}</h1>
      <p class="meta">${esc(x.meta)}</p>
      <p class="meta">${esc(x.note)} <a href="../">${esc(x.noteLink)}</a>.</p>

      <div class="card">
        <h2>${esc(x.short[0])}</h2>
        <p>${esc(x.short[1])}</p>
      </div>
${x.sections.map(([t, html]) => `
      <h2>${esc(t)}</h2>
      ${html}`).join('\n')}
    </main>
  </body>
</html>
`;
  const dir = join(root, 'public/privacy', lang);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), h + body);
  console.log('wrote', `public/privacy/${lang}/index.html`);
}
