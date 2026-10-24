Kanji Unified Mincho is derived from IPAmj Mincho Ver.006.01.
Copyright and licensing: see IPA-Font-License.txt in this directory.
Original source: https://moji.or.jp/mojikiban/font/
Original download (linked by the publisher):
https://forest.watch.impress.co.jp/library/software/ipamjfont/

Changes: subset to all IPAmj-covered game characters (including 104 traditional element characters) plus Latin, kana and punctuation;
renamed family/PostScript identifiers; converted to WOFF2. Glyph outlines are unchanged.
The derivation script is scripts/build-character-font.py in the Site source.

To replace this derived font with the original program:
1. Download the original IPAmj Mincho Ver.006.01 from the source above.
2. Extract ipamjm.ttf and serve it as /vendor/fonts/ipamjm.ttf in this Site.
3. In character-font.css, change the src URL to /vendor/fonts/ipamjm.ttf
   and format to truetype. Keeping the CSS font-family alias is permitted.
The original TTF MD5 is BEEE256D4FFEC4C40493805A4D7E5CDD.

The game uses this font throughout its interface and character display.

Fourteen element characters missing in IPAmj Mincho are supplied automatically
by Kanji Element Mincho, a renamed WOFF2 subset of BabelStone Han 16.0.3
(https://www.babelstone.co.uk/Fonts/Han.html).
Only the fourteen missing Unicode codepoints are exposed in character-font.css.
Glyph outlines are unchanged; full-width advances retain each source font scale.
License: Arphic Public License (1999), see Arphic-Public-License.txt.
Derivation: scripts/build-element-fonts.py ORIGINAL_IPAMJM_TTF BABELSTONE_HAN_TTF.
Element inventory and exact coverage: character-font-coverage.json.

Delivery: scripts/split-character-font.py creates content-addressed Unicode subsets from the existing WOFF2. Character coverage, outlines and advance widths are verified against that file. The original WOFF2 remains for older app versions. Font license is unchanged.
