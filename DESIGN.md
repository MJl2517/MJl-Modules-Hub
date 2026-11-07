# Дизайн модулей MJl

- Публичное имя — **MJl - [название]**. Установленный идентификатор пакета и пространство флагов сохраняются при переименовании.
- Малина служит общей эмблемой. На обложке её сопровождает один предмет, который передаёт назначение модуля. У MJl - Pointcrawl это раскрытая карта.
- Общие цвета хранятся в [styles/theme.css](styles/theme.css). Сливовый фон `#211c29`, панели `#32283b`, кремовый текст `#f7ecdf`, малиновый акцент `#f497ad`. Акцент используется для фокуса и активных действий.
- Поставляйте локальные копии `styles/theme.css` и `art/raspberry.webp` в каждом модуле. Обложки каталога готовьте как растровые WebP-иллюстрации в пропорции 3:2. Добавляйте класс `mjl-brand` к своим `ApplicationV2` и `DialogV2`. Модуль загружает оформление из собственного пакета.
- При наличии интеграции публикуйте узкий версионированный API через `game.modules.get(id).api`. У потребителя должна быть проверка `module?.active` и версии API. Возвращайте только данные, доступные текущему пользователю, и сохраняйте работу модуля при выключенных интеграциях.

## Обложки этого выпуска

**Loot and Share**

Встроенный ImageGen. Обложки Campaign Journal и Dungeon Sketch использованы как референсы стиля и эмблемы.

Use case: illustration-story. New 3:2 full-bleed fantasy raster catalogue cover for Loot and Share. Use the supplied covers only as references for the recognizable round raspberry mascot with two green leaves, and for the series' rich oil and gouache texture, deep plum shadows and warm amber candlelight. On a medieval adventurers' table the large raspberry, without a face or limbs, peeks behind an open weathered wooden chest with brass corners. Inside are bright gold and silver coins, a rolled scroll and a red glass potion. In the foreground arrange the coins in three clearly separated small shares beside a pair of inventory pouches. Keep the raspberry, chest, and shares visually distinct and readable in the central 75% of the image. No characters, hands, maps, text, logos, interface, borders, or watermark.

**Campaign Journal**

Встроенный ImageGen. Обложки Pointcrawl и Dungeon Sketch использованы как референсы стиля и эмблемы.

Use case: illustration-story. Create a new full-bleed 3:2 raster fantasy catalogue cover for Campaign Journal. Use the supplied covers only as references for the raspberry mascot and consistent painted style: rich gouache and oil brush texture, warm amber candlelight, deep plum shadows and raspberry red. A large, round raspberry with two green leaves, no face or limbs, sits behind an open, leather-bound campaign journal on a medieval writing desk. Make the book immediately recognizable by its spine, ribbon bookmark and layered pages. On the left page show a small ink portrait of a cloaked adventurer, on the right a painted mountain stronghold mounted like a keepsake, with a small red wax seal near the bottom. The mascot and book fill the middle 75% and remain legible at card scale. Keep this a book, not a map. No writing, letters, grids, paths, logos, UI, borders or watermark.

**Dungeon Sketch**

Встроенный ImageGen. Обложки Pointcrawl и Dungeondraft использованы как референсы стиля и эмблемы.

Use case: illustration-story. Create a new 3:2 full-bleed raster fantasy catalogue cover for Dungeon Sketch, matching the two supplied images as style and mascot references only. Use painterly digital gouache and oil texture, amber candlelight, dark plum shadows and vivid raspberry red. A large round raspberry mascot with two green leaves, no face or limbs, peers over the far edge of a horizontal parchment on a cartographer's table. Seen at a high three-quarter angle, the parchment shows a boldly hand-drawn top-down dungeon floor plan with a clear stair symbol, stone hatching, and a few fresh raspberry-ink strokes. A red feather quill hovers above an unfinished wall as if guided by invisible hands. Keep the raspberry, quill and flat plan distinct in the central 75%, readable at card size. Do not make a miniature stone diorama, folded world map, or magical 3D transformation. No writing, letters, logos, UI, borders, watermark, or characters.

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
