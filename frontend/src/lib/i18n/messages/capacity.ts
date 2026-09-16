/**
 * Per-user 50 MB allowance and local system capability / model recommendation
 * strings for the seven approved application languages. English is the source
 * of truth for the key set.
 */
export const capacity = {
  en: {
    "quota.title": "Your 50 MB allowance",
    "quota.subtitle":
      "Everything you keep — study data and uploaded files — shares one 50 MB allowance.",
    "quota.used": "{used} of {total} used ({percent}%)",
    "quota.remaining": "{remaining} left",
    "quota.database": "Study data",
    "quota.storage": "Files",
    "quota.warning":
      "You have used {percent}% of your 50 MB allowance. Delete some files or older data to make room.",
    "quota.full":
      "Your 50 MB allowance is full. Delete some files or older data before saving anything new.",
    "quota.blockedUpload": "This does not fit in your remaining allowance. Delete something first.",
    "quota.exceededError": "Your 50 MB allowance is full, so this could not be saved.",
    "quota.unavailable": "We could not read your allowance right now.",
    "quota.refresh": "Refresh",
    "quota.systemNote": "Shared app files are not part of your allowance.",

    "capability.title": "System check",
    "capability.subtitle":
      "Before you choose a model we ask your local AI server what your computer can run.",
    "capability.status.pending": "Checking your system…",
    "capability.status.ready": "System checked",
    "capability.status.unavailable":
      "Your local AI server is not connected, so your computer was not measured.",
    "capability.status.stale": "These values are older than ten minutes.",
    "capability.status.error": "The system check did not finish.",
    "capability.noValuesNote":
      "Nothing here is estimated. Graphics memory, system memory and free disk space can only be measured by your local AI server.",
    "capability.os": "Operating system",
    "capability.ram": "System memory",
    "capability.gpu": "Graphics card",
    "capability.vram": "Graphics memory",
    "capability.storage": "Free space for models",
    "capability.balancing": "Automatic load balancing",
    "capability.balancing.gpu_only": "Graphics card only",
    "capability.balancing.cpu_gpu_split": "Shared between processor and graphics card",
    "capability.balancing.unified_memory": "Shared memory",
    "capability.balancing.cpu_only": "Processor only",
    "capability.balancing.unknown": "Unknown",
    "capability.spareCapacity": "Room for {count} more model sessions",
    "capability.recommended": "Recommended model",
    "capability.alternatives": "Other options",
    "capability.headroom": "About {percent}% headroom left",
    "capability.noRecommendation": "No recommendation yet.",
    "capability.recheck": "Check again",
    "capability.measuredAt": "Checked at {time}",
    "capability.aiOptional":
      "You can use the app without AI. Signing in never depends on your local AI server.",
    "capability.futureNote":
      "The measurement is done by the local AI server, which is not ready yet.",

    "admission.optionalNote":
      "This check is only for AI features. You can continue into the app without it.",
  },
  de: {
    "quota.title": "Dein Speicherplatz von 50 MB",
    "quota.subtitle":
      "Alles, was du behältst – Lerndaten und hochgeladene Dateien – teilt sich 50 MB Speicherplatz.",
    "quota.used": "{used} von {total} genutzt ({percent}%)",
    "quota.remaining": "{remaining} frei",
    "quota.database": "Lerndaten",
    "quota.storage": "Dateien",
    "quota.warning":
      "Du hast {percent}% deiner 50 MB genutzt. Lösche Dateien oder ältere Daten, um Platz zu schaffen.",
    "quota.full":
      "Deine 50 MB sind voll. Lösche Dateien oder ältere Daten, bevor du Neues speicherst.",
    "quota.blockedUpload": "Das passt nicht mehr in deinen Speicherplatz. Lösche zuerst etwas.",
    "quota.exceededError": "Deine 50 MB sind voll, deshalb konnte nichts gespeichert werden.",
    "quota.unavailable": "Wir konnten deinen Speicherplatz gerade nicht abfragen.",
    "quota.refresh": "Aktualisieren",
    "quota.systemNote": "Gemeinsame App-Dateien gehören nicht zu deinem Speicherplatz.",

    "capability.title": "Systemprüfung",
    "capability.subtitle":
      "Bevor du ein Modell wählst, fragen wir deinen lokalen KI-Server, was dein Computer ausführen kann.",
    "capability.status.pending": "Dein System wird geprüft…",
    "capability.status.ready": "System geprüft",
    "capability.status.unavailable":
      "Dein lokaler KI-Server ist nicht verbunden, deshalb wurde dein Computer nicht gemessen.",
    "capability.status.stale": "Diese Werte sind älter als zehn Minuten.",
    "capability.status.error": "Die Systemprüfung wurde nicht abgeschlossen.",
    "capability.noValuesNote":
      "Nichts hier ist geschätzt. Grafikspeicher, Arbeitsspeicher und freier Speicherplatz können nur vom lokalen KI-Server gemessen werden.",
    "capability.os": "Betriebssystem",
    "capability.ram": "Arbeitsspeicher",
    "capability.gpu": "Grafikkarte",
    "capability.vram": "Grafikspeicher",
    "capability.storage": "Freier Platz für Modelle",
    "capability.balancing": "Automatische Lastverteilung",
    "capability.balancing.gpu_only": "Nur Grafikkarte",
    "capability.balancing.cpu_gpu_split": "Geteilt zwischen Prozessor und Grafikkarte",
    "capability.balancing.unified_memory": "Gemeinsamer Speicher",
    "capability.balancing.cpu_only": "Nur Prozessor",
    "capability.balancing.unknown": "Unbekannt",
    "capability.spareCapacity": "Platz für {count} weitere Modellsitzungen",
    "capability.recommended": "Empfohlenes Modell",
    "capability.alternatives": "Andere Möglichkeiten",
    "capability.headroom": "Noch etwa {percent}% Reserve",
    "capability.noRecommendation": "Noch keine Empfehlung.",
    "capability.recheck": "Erneut prüfen",
    "capability.measuredAt": "Geprüft um {time}",
    "capability.aiOptional":
      "Du kannst die App ohne KI nutzen. Die Anmeldung hängt nie von deinem lokalen KI-Server ab.",
    "capability.futureNote":
      "Die Messung übernimmt der lokale KI-Server, der noch nicht bereit ist.",

    "admission.optionalNote":
      "Diese Prüfung betrifft nur KI-Funktionen. Du kannst auch ohne sie in die App.",
  },
  gsw: {
    "quota.title": "Din Spiicherplatz vo 50 MB",
    "quota.subtitle":
      "Alles, wo du behaltisch – Lerndate und ufeglade Dateie – teilt sich 50 MB Spiicherplatz.",
    "quota.used": "{used} vo {total} bruucht ({percent}%)",
    "quota.remaining": "{remaining} frei",
    "quota.database": "Lerndate",
    "quota.storage": "Dateie",
    "quota.warning":
      "Du hesch {percent}% vo dine 50 MB bruucht. Lösch Dateie oder alti Date, ass es wider Platz git.",
    "quota.full": "Dini 50 MB sind volle. Lösch Dateie oder alti Date, bevor du Neus spiicherisch.",
    "quota.blockedUpload": "Das het kei Platz meh i dim Spiicher. Lösch zerscht öppis.",
    "quota.exceededError": "Dini 50 MB sind volle, drum het me nüt chöne spiichere.",
    "quota.unavailable": "Mir hei din Spiicherplatz grad nid chöne abfrage.",
    "quota.refresh": "Aktualisiere",
    "quota.systemNote": "Gmeinsami App-Dateie ghöre nid zu dim Spiicherplatz.",

    "capability.title": "Systemprüefig",
    "capability.subtitle":
      "Bevor du es Modell uswählsch, frage mir din lokale KI-Server, was din Computer cha laufe la.",
    "capability.status.pending": "Din System wird prüeft…",
    "capability.status.ready": "System prüeft",
    "capability.status.unavailable":
      "Din lokale KI-Server isch nid verbunde, drum isch din Computer nid gmässe worde.",
    "capability.status.stale": "Die Wärt sind elter als zäh Minute.",
    "capability.status.error": "D Systemprüefig isch nid fertig worde.",
    "capability.noValuesNote":
      "Da isch nüt gschätzt. Grafikspiicher, Arbetsspiicher und freie Platz cha nume de lokal KI-Server mässe.",
    "capability.os": "Betriebssystem",
    "capability.ram": "Arbetsspiicher",
    "capability.gpu": "Grafikcharte",
    "capability.vram": "Grafikspiicher",
    "capability.storage": "Freie Platz für Modell",
    "capability.balancing": "Automatischi Laschtverteilig",
    "capability.balancing.gpu_only": "Nume Grafikcharte",
    "capability.balancing.cpu_gpu_split": "Teilt zwüsche Prozessor und Grafikcharte",
    "capability.balancing.unified_memory": "Gmeinsame Spiicher",
    "capability.balancing.cpu_only": "Nume Prozessor",
    "capability.balancing.unknown": "Unbekannt",
    "capability.spareCapacity": "Platz für {count} witeri Modellsitzige",
    "capability.recommended": "Empfohlnigs Modell",
    "capability.alternatives": "Anderi Möglichkeite",
    "capability.headroom": "No öppe {percent}% Reserve",
    "capability.noRecommendation": "No kei Empfehlig.",
    "capability.recheck": "Nomol prüefe",
    "capability.measuredAt": "Prüeft am {time}",
    "capability.aiOptional":
      "Du chasch d App ohni KI bruuche. S Aamelde hanget nie vo dim lokale KI-Server ab.",
    "capability.futureNote": "D Mässig macht de lokal KI-Server, wo no nid parat isch.",

    "admission.optionalNote":
      "Die Prüefig betrifft nume KI-Funktione. Du chasch au ohni sie i d App.",
  },
  ru: {
    "quota.title": "Ваш объём 50 МБ",
    "quota.subtitle":
      "Всё, что вы храните — учебные данные и загруженные файлы — использует общий объём 50 МБ.",
    "quota.used": "Использовано {used} из {total} ({percent}%)",
    "quota.remaining": "Осталось {remaining}",
    "quota.database": "Учебные данные",
    "quota.storage": "Файлы",
    "quota.warning":
      "Вы использовали {percent}% своих 50 МБ. Удалите файлы или старые данные, чтобы освободить место.",
    "quota.full":
      "Ваши 50 МБ заполнены. Удалите файлы или старые данные, прежде чем сохранять новое.",
    "quota.blockedUpload": "Это не поместится в оставшийся объём. Сначала удалите что-нибудь.",
    "quota.exceededError": "Ваши 50 МБ заполнены, поэтому сохранить не удалось.",
    "quota.unavailable": "Сейчас не удалось узнать ваш объём.",
    "quota.refresh": "Обновить",
    "quota.systemNote": "Общие файлы приложения не входят в ваш объём.",

    "capability.title": "Проверка системы",
    "capability.subtitle":
      "Перед выбором модели мы спрашиваем ваш локальный ИИ-сервер, что может ваш компьютер.",
    "capability.status.pending": "Проверяем вашу систему…",
    "capability.status.ready": "Система проверена",
    "capability.status.unavailable":
      "Локальный ИИ-сервер не подключён, поэтому компьютер не измерялся.",
    "capability.status.stale": "Эти значения старше десяти минут.",
    "capability.status.error": "Проверка системы не завершилась.",
    "capability.noValuesNote":
      "Здесь ничего не оценивается приблизительно. Видеопамять, оперативную память и свободное место может измерить только локальный ИИ-сервер.",
    "capability.os": "Операционная система",
    "capability.ram": "Оперативная память",
    "capability.gpu": "Видеокарта",
    "capability.vram": "Видеопамять",
    "capability.storage": "Свободное место для моделей",
    "capability.balancing": "Автоматическое распределение нагрузки",
    "capability.balancing.gpu_only": "Только видеокарта",
    "capability.balancing.cpu_gpu_split": "Разделено между процессором и видеокартой",
    "capability.balancing.unified_memory": "Общая память",
    "capability.balancing.cpu_only": "Только процессор",
    "capability.balancing.unknown": "Неизвестно",
    "capability.spareCapacity": "Есть место ещё для {count} сессий модели",
    "capability.recommended": "Рекомендованная модель",
    "capability.alternatives": "Другие варианты",
    "capability.headroom": "Остаётся около {percent}% запаса",
    "capability.noRecommendation": "Рекомендации пока нет.",
    "capability.recheck": "Проверить снова",
    "capability.measuredAt": "Проверено в {time}",
    "capability.aiOptional":
      "Приложением можно пользоваться без ИИ. Вход никогда не зависит от локального ИИ-сервера.",
    "capability.futureNote": "Измерение выполняет локальный ИИ-сервер, который пока не готов.",

    "admission.optionalNote":
      "Эта проверка нужна только для функций ИИ. Вы можете войти в приложение и без неё.",
  },
  es: {
    "quota.title": "Tu espacio de 50 MB",
    "quota.subtitle":
      "Todo lo que guardas —datos de estudio y archivos subidos— comparte un espacio de 50 MB.",
    "quota.used": "{used} de {total} usados ({percent}%)",
    "quota.remaining": "Quedan {remaining}",
    "quota.database": "Datos de estudio",
    "quota.storage": "Archivos",
    "quota.warning":
      "Has usado el {percent}% de tus 50 MB. Elimina archivos o datos antiguos para hacer espacio.",
    "quota.full":
      "Tus 50 MB están llenos. Elimina archivos o datos antiguos antes de guardar algo nuevo.",
    "quota.blockedUpload": "Esto no cabe en tu espacio restante. Elimina algo primero.",
    "quota.exceededError": "Tus 50 MB están llenos, así que no se pudo guardar.",
    "quota.unavailable": "No pudimos consultar tu espacio en este momento.",
    "quota.refresh": "Actualizar",
    "quota.systemNote": "Los archivos compartidos de la aplicación no cuentan en tu espacio.",

    "capability.title": "Comprobación del sistema",
    "capability.subtitle":
      "Antes de elegir un modelo preguntamos a tu servidor de IA local qué puede ejecutar tu ordenador.",
    "capability.status.pending": "Comprobando tu sistema…",
    "capability.status.ready": "Sistema comprobado",
    "capability.status.unavailable":
      "Tu servidor de IA local no está conectado, así que no se midió tu ordenador.",
    "capability.status.stale": "Estos valores tienen más de diez minutos.",
    "capability.status.error": "La comprobación del sistema no terminó.",
    "capability.noValuesNote":
      "Aquí nada se estima. La memoria gráfica, la memoria del sistema y el espacio libre solo puede medirlos tu servidor de IA local.",
    "capability.os": "Sistema operativo",
    "capability.ram": "Memoria del sistema",
    "capability.gpu": "Tarjeta gráfica",
    "capability.vram": "Memoria gráfica",
    "capability.storage": "Espacio libre para modelos",
    "capability.balancing": "Reparto automático de carga",
    "capability.balancing.gpu_only": "Solo tarjeta gráfica",
    "capability.balancing.cpu_gpu_split": "Compartido entre procesador y tarjeta gráfica",
    "capability.balancing.unified_memory": "Memoria compartida",
    "capability.balancing.cpu_only": "Solo procesador",
    "capability.balancing.unknown": "Desconocido",
    "capability.spareCapacity": "Espacio para {count} sesiones de modelo más",
    "capability.recommended": "Modelo recomendado",
    "capability.alternatives": "Otras opciones",
    "capability.headroom": "Queda alrededor del {percent}% de margen",
    "capability.noRecommendation": "Todavía no hay recomendación.",
    "capability.recheck": "Comprobar de nuevo",
    "capability.measuredAt": "Comprobado a las {time}",
    "capability.aiOptional":
      "Puedes usar la aplicación sin IA. Iniciar sesión nunca depende de tu servidor de IA local.",
    "capability.futureNote":
      "La medición la hace el servidor de IA local, que todavía no está listo.",

    "admission.optionalNote":
      "Esta comprobación solo afecta a las funciones de IA. Puedes entrar en la aplicación sin ella.",
  },
  fr: {
    "quota.title": "Votre espace de 50 Mo",
    "quota.subtitle":
      "Tout ce que vous conservez — données d'étude et fichiers envoyés — partage un espace de 50 Mo.",
    "quota.used": "{used} sur {total} utilisés ({percent} %)",
    "quota.remaining": "Il reste {remaining}",
    "quota.database": "Données d'étude",
    "quota.storage": "Fichiers",
    "quota.warning":
      "Vous avez utilisé {percent} % de vos 50 Mo. Supprimez des fichiers ou d'anciennes données pour faire de la place.",
    "quota.full":
      "Vos 50 Mo sont pleins. Supprimez des fichiers ou d'anciennes données avant d'enregistrer du nouveau.",
    "quota.blockedUpload": "Cela ne tient pas dans l'espace restant. Supprimez d'abord un élément.",
    "quota.exceededError": "Vos 50 Mo sont pleins, l'enregistrement a donc échoué.",
    "quota.unavailable": "Nous n'avons pas pu consulter votre espace pour le moment.",
    "quota.refresh": "Actualiser",
    "quota.systemNote": "Les fichiers partagés de l'application ne comptent pas dans votre espace.",

    "capability.title": "Vérification du système",
    "capability.subtitle":
      "Avant de choisir un modèle, nous demandons à votre serveur d'IA local ce que votre ordinateur peut exécuter.",
    "capability.status.pending": "Vérification de votre système…",
    "capability.status.ready": "Système vérifié",
    "capability.status.unavailable":
      "Votre serveur d'IA local n'est pas connecté, votre ordinateur n'a donc pas été mesuré.",
    "capability.status.stale": "Ces valeurs ont plus de dix minutes.",
    "capability.status.error": "La vérification du système n'est pas allée au bout.",
    "capability.noValuesNote":
      "Rien n'est estimé ici. La mémoire graphique, la mémoire système et l'espace libre ne peuvent être mesurés que par votre serveur d'IA local.",
    "capability.os": "Système d'exploitation",
    "capability.ram": "Mémoire système",
    "capability.gpu": "Carte graphique",
    "capability.vram": "Mémoire graphique",
    "capability.storage": "Espace libre pour les modèles",
    "capability.balancing": "Répartition automatique de la charge",
    "capability.balancing.gpu_only": "Carte graphique uniquement",
    "capability.balancing.cpu_gpu_split": "Partagé entre processeur et carte graphique",
    "capability.balancing.unified_memory": "Mémoire partagée",
    "capability.balancing.cpu_only": "Processeur uniquement",
    "capability.balancing.unknown": "Inconnu",
    "capability.spareCapacity": "De la place pour {count} sessions de modèle en plus",
    "capability.recommended": "Modèle recommandé",
    "capability.alternatives": "Autres options",
    "capability.headroom": "Il reste environ {percent} % de marge",
    "capability.noRecommendation": "Pas encore de recommandation.",
    "capability.recheck": "Vérifier à nouveau",
    "capability.measuredAt": "Vérifié à {time}",
    "capability.aiOptional":
      "Vous pouvez utiliser l'application sans IA. La connexion ne dépend jamais de votre serveur d'IA local.",
    "capability.futureNote":
      "La mesure est réalisée par le serveur d'IA local, qui n'est pas encore prêt.",

    "admission.optionalNote":
      "Cette vérification ne concerne que les fonctions d'IA. Vous pouvez entrer dans l'application sans elle.",
  },
  it: {
    "quota.title": "Il tuo spazio di 50 MB",
    "quota.subtitle":
      "Tutto ciò che conservi — dati di studio e file caricati — condivide uno spazio di 50 MB.",
    "quota.used": "{used} di {total} usati ({percent}%)",
    "quota.remaining": "Restano {remaining}",
    "quota.database": "Dati di studio",
    "quota.storage": "File",
    "quota.warning":
      "Hai usato il {percent}% dei tuoi 50 MB. Elimina file o dati vecchi per fare spazio.",
    "quota.full":
      "I tuoi 50 MB sono pieni. Elimina file o dati vecchi prima di salvare qualcosa di nuovo.",
    "quota.blockedUpload": "Questo non rientra nello spazio rimasto. Elimina prima qualcosa.",
    "quota.exceededError": "I tuoi 50 MB sono pieni, quindi non è stato possibile salvare.",
    "quota.unavailable": "Non è stato possibile leggere il tuo spazio in questo momento.",
    "quota.refresh": "Aggiorna",
    "quota.systemNote": "I file condivisi dell'app non rientrano nel tuo spazio.",

    "capability.title": "Controllo del sistema",
    "capability.subtitle":
      "Prima di scegliere un modello chiediamo al tuo server IA locale cosa può eseguire il tuo computer.",
    "capability.status.pending": "Controllo del sistema in corso…",
    "capability.status.ready": "Sistema controllato",
    "capability.status.unavailable":
      "Il tuo server IA locale non è collegato, quindi il computer non è stato misurato.",
    "capability.status.stale": "Questi valori risalgono a più di dieci minuti.",
    "capability.status.error": "Il controllo del sistema non è stato completato.",
    "capability.noValuesNote":
      "Qui nulla è stimato. Memoria grafica, memoria di sistema e spazio libero possono essere misurati solo dal server IA locale.",
    "capability.os": "Sistema operativo",
    "capability.ram": "Memoria di sistema",
    "capability.gpu": "Scheda grafica",
    "capability.vram": "Memoria grafica",
    "capability.storage": "Spazio libero per i modelli",
    "capability.balancing": "Bilanciamento automatico del carico",
    "capability.balancing.gpu_only": "Solo scheda grafica",
    "capability.balancing.cpu_gpu_split": "Condiviso tra processore e scheda grafica",
    "capability.balancing.unified_memory": "Memoria condivisa",
    "capability.balancing.cpu_only": "Solo processore",
    "capability.balancing.unknown": "Sconosciuto",
    "capability.spareCapacity": "Spazio per altre {count} sessioni del modello",
    "capability.recommended": "Modello consigliato",
    "capability.alternatives": "Altre opzioni",
    "capability.headroom": "Resta circa il {percent}% di margine",
    "capability.noRecommendation": "Nessun consiglio per ora.",
    "capability.recheck": "Controlla di nuovo",
    "capability.measuredAt": "Controllato alle {time}",
    "capability.aiOptional":
      "Puoi usare l'app senza IA. L'accesso non dipende mai dal tuo server IA locale.",
    "capability.futureNote":
      "La misurazione la esegue il server IA locale, che non è ancora pronto.",

    "admission.optionalNote":
      "Questo controllo riguarda solo le funzioni IA. Puoi entrare nell'app anche senza.",
  },
};
