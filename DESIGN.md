# Дизайн модулей MJl

- Публичное имя — **MJl [название]**. Установленный идентификатор пакета и пространство флагов сохраняются при переименовании.
- Малина служит общей эмблемой. На обложке её сопровождает один предмет, который передаёт назначение модуля. У MJl Pointcrawl это раскрытая карта.
- Общие цвета хранятся в [styles/theme.css](styles/theme.css). Сливовый фон `#211c29`, панели `#32283b`, кремовый текст `#f7ecdf`, малиновый акцент `#f497ad`. Акцент используется для фокуса и активных действий.
- Поставляйте локальные копии `styles/theme.css` и `art/raspberry.webp` в каждом модуле. Обложки каталога готовьте как растровые WebP-иллюстрации в пропорции 3:2. Добавляйте класс `mjl-brand` к своим `ApplicationV2` и `DialogV2`. Модуль загружает оформление из собственного пакета.
- При наличии интеграции публикуйте узкий версионированный API через `game.modules.get(id).api`. У потребителя должна быть проверка `module?.active` и версии API. Возвращайте только данные, доступные текущему пользователю, и сохраняйте работу модуля при выключенных интеграциях.

## Обложки этого выпуска

Обложки созданы встроенным ImageGen. Для Pointcrawl использовано прежнее изображение малины как референс, для остальных обложек использованы текстовые запросы.

Use case: illustration-story. Create a premium painterly fantasy cover for a Foundry VTT module catalogue, landscape 3:2. Rich digital gouache and oil brush texture, warm parchment gold highlights against dark aubergine, warm raspberry accents. Painterly material detail, dimensional lighting, striking readable silhouette. Main subject fully framed inside central 75% so it survives landscape card cropping. Full bleed, no text, letters, lettering, border, UI, watermark or logos.

**Pointcrawl**
Use the supplied image as a subject and composition reference only, repaint entirely in rich raster detail. One large raspberry mascot with two deep green leaves, rounded clustered raspberry drupelets, no facial features, peeks from behind a fully unfolded three-panel fantasy parchment map, positioned as if held by invisible hands. No visible arms or hands. The foreground map is the dominant prop, with ink mountains, a compass rose, rivers and a dotted expedition trail. Cozy antique cartographer workshop ambience, dark plum haze, a few golden sparks. Keep both top leaves and bottom map corners comfortably inside the crop.

**Hub**
One recognizable plump raspberry, assembled from round drupelets and two green leaves, hovering like a magical seal above a dark fantasy cartographer's table. Restrained warm brass glow and subdued plum surroundings. Raspberry centrally framed in a compact silhouette, it will also be center-cropped square to use as the Hub badge. Nothing else competes with it.

**Dungeondraft**
A miniature handcrafted stone dungeon diorama on a dusky stone worktable, an isometric cutaway with three linked rooms, stairs and open passageways. Candle and torch glows graze cool slate blocks. One tiny raspberry on a ledge is a subtle recurring brand motif, clearly secondary. Detailed illustration, bold spatial composition, no characters.

**One Page Dungeon Importer**
Use case: illustration-story. Premium painterly fantasy landscape catalogue cover for a one-page dungeon map importer. An old cartographer's sheet at a three-quarter angle on a dark aubergine desk, clearly showing an inked top-down dungeon plan with rooms and narrow passages. One corner of the parchment magically rises into three-dimensional stone rooms and stairs, suggesting an imported playable map. Warm parchment gold, purple shadows, raspberry sparks, rich oil and gouache brush texture. Subject fits central 75% of a full-bleed 3:2 frame, readable at small size. No characters, writing, text, UI, logos or watermarks.
