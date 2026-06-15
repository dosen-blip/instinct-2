#!/usr/bin/env bash
set -euo pipefail

mkdir -p assets

download() {
  local name="$1"
  local url="$2"
  local out="assets/${name}.png"

  if [[ -s "$out" ]]; then
    printf 'skip %s\n' "$out"
    return
  fi

  printf 'download %s\n' "$out"
  curl -L --fail --retry 2 --retry-delay 1 -o "$out" "$url"
}

download mobile-mcp-home-logo "https://www.figma.com/api/mcp/asset/94db1115-8ac5-41eb-95e2-a51827472e67"
download mobile-mcp-home-hero "https://www.figma.com/api/mcp/asset/ed18f5b2-0641-40da-9305-54f85c02e954"
download mobile-mcp-home-next-poster "https://www.figma.com/api/mcp/asset/a2ae74fa-7789-4ab8-89b0-0bc3187e35a1"
download mobile-mcp-home-crew "https://www.figma.com/api/mcp/asset/81b849a4-4d9e-4e24-aa27-40167ed8998e"
download mobile-mcp-home-vol1 "https://www.figma.com/api/mcp/asset/2cb231ee-7fcb-4c8b-a16c-87f4e086ed06"
download mobile-mcp-home-vol2 "https://www.figma.com/api/mcp/asset/80bea94a-2e71-429a-a21b-5ff5a8a3ae39"
download mobile-mcp-home-vol2-overlay "https://www.figma.com/api/mcp/asset/8d182b12-309c-4767-b045-9d94495347c1"
download mobile-mcp-home-vol3 "https://www.figma.com/api/mcp/asset/7023c394-3edb-4fb2-97fa-d71705d588be"
download mobile-mcp-home-vol4 "https://www.figma.com/api/mcp/asset/0aa1e3eb-33b9-4c44-b70c-d5da32b6ebb1"

download mobile-mcp-next-hero "https://www.figma.com/api/mcp/asset/45d8e233-e61a-4502-8e77-287b87885a5c"
download mobile-mcp-next-dj-cobb "https://www.figma.com/api/mcp/asset/9ee62d86-86a9-4c92-bdd7-1422c7bdb4c0"
download mobile-mcp-next-seb-balla "https://www.figma.com/api/mcp/asset/0b6776e5-f917-469c-8611-c66a4e0062df"
download mobile-mcp-next-babyjake "https://www.figma.com/api/mcp/asset/c1552a60-b936-43fd-b136-618f72997b48"
download mobile-mcp-drink-festival-fuel "https://www.figma.com/api/mcp/asset/24b57d61-f1ce-4fec-9052-f5da4ffa4e52"
download mobile-mcp-drink-liquid-cocaine "https://www.figma.com/api/mcp/asset/8badc6b6-9063-4d5c-9327-3852ac249734"

download mobile-mcp-vol1-poster "https://www.figma.com/api/mcp/asset/5b6f22ca-127d-4f32-84bd-327dbeced2cf"
download mobile-mcp-vol1-photo1 "https://www.figma.com/api/mcp/asset/4c472dcf-9019-4b0d-b4c5-e9a5dbf596a9"
download mobile-mcp-vol1-photo2 "https://www.figma.com/api/mcp/asset/b4d1041c-b50a-42d2-ad57-81ee1a4e3072"
download mobile-mcp-vol1-photo3 "https://www.figma.com/api/mcp/asset/6f6a3469-173f-42a1-80e3-860b75121eda"
download mobile-mcp-vol1-photo4 "https://www.figma.com/api/mcp/asset/2c1164cd-3b2a-44be-b844-b8cb7853236e"
download mobile-mcp-vol1-photo5 "https://www.figma.com/api/mcp/asset/9088b015-62dd-46e9-841a-e2a535e0be9b"
download mobile-mcp-vol1-photo6 "https://www.figma.com/api/mcp/asset/22ba473d-8a39-4b8c-ad3b-45416ead6380"

download mobile-mcp-vol2-poster "https://www.figma.com/api/mcp/asset/cad4a822-1eab-450e-80e2-d4fa1f6aeaed"
download mobile-mcp-vol2-photo1 "https://www.figma.com/api/mcp/asset/951e0d8f-feb4-4f1a-9414-9ed16f97d0e0"
download mobile-mcp-vol2-photo2 "https://www.figma.com/api/mcp/asset/980d1099-1fba-418f-8ec0-6f185f93e1e6"
download mobile-mcp-vol2-photo3 "https://www.figma.com/api/mcp/asset/bbaa6993-320f-4eee-9f69-1303cab73768"
download mobile-mcp-vol2-photo4 "https://www.figma.com/api/mcp/asset/f90adf85-4c4b-446d-af1c-ee32e02c125b"
download mobile-mcp-vol2-photo5 "https://www.figma.com/api/mcp/asset/316c4964-d96c-4c53-a79e-1ffc1b47b644"
download mobile-mcp-vol2-photo6 "https://www.figma.com/api/mcp/asset/12325369-46f9-4cd3-aadb-2019f639afd0"

download mobile-mcp-vol3-poster "https://www.figma.com/api/mcp/asset/606d36e1-1812-48c6-b9c9-aed081a8c3f5"
download mobile-mcp-vol3-photo1 "https://www.figma.com/api/mcp/asset/fb70cbc6-6f83-484c-ad77-55804aa8b3a4"
download mobile-mcp-vol3-photo2 "https://www.figma.com/api/mcp/asset/cf0176bf-01e6-4814-8a4e-4cda18c1c82b"
download mobile-mcp-vol3-photo3 "https://www.figma.com/api/mcp/asset/7a197a02-96b2-44ab-8b50-4bb893560311"
download mobile-mcp-vol3-photo4 "https://www.figma.com/api/mcp/asset/5a430f3a-20e5-47b9-a693-9d491ac59aa3"
download mobile-mcp-vol3-photo5 "https://www.figma.com/api/mcp/asset/e372c5d6-280f-4835-a5c5-5f38393a3219"
download mobile-mcp-vol3-photo6 "https://www.figma.com/api/mcp/asset/7d9bc5d7-30b2-44e8-ab8f-dddda53d6241"

download mobile-mcp-vol4-poster "https://www.figma.com/api/mcp/asset/b0ee6b4a-3710-4660-8917-e01fea43b0b8"
download mobile-mcp-vol4-photo1 "https://www.figma.com/api/mcp/asset/0a76ca66-05e5-4c79-b5de-dfd6f4829a08"
download mobile-mcp-vol4-photo2 "https://www.figma.com/api/mcp/asset/37477708-4af2-4872-8c99-492061ca78ab"
download mobile-mcp-vol4-photo3 "https://www.figma.com/api/mcp/asset/f76c5300-5980-4d62-ba77-e00fd8bc1670"
download mobile-mcp-vol4-photo4 "https://www.figma.com/api/mcp/asset/1da70da1-f547-404e-8331-e94c2c378b25"
download mobile-mcp-vol4-photo5 "https://www.figma.com/api/mcp/asset/672f095c-eede-4b1f-b495-0ff5766fe4d0"
download mobile-mcp-vol4-photo6 "https://www.figma.com/api/mcp/asset/e4701e87-b12b-4940-8043-8e66ee25199e"

download mobile-mcp-artist-dj-cobb-hero "https://www.figma.com/api/mcp/asset/41f6ad0a-0933-466d-82cc-4b9f162c2f0f"
download mobile-mcp-artist-dj-cobb-photo "https://www.figma.com/api/mcp/asset/19532269-364f-4e4f-be67-aee42e24d6b6"
download mobile-mcp-artist-seb-balla-hero "https://www.figma.com/api/mcp/asset/e4b17fad-2383-4d3e-86be-5ed0b7959861"
download mobile-mcp-artist-seb-balla-photo "https://www.figma.com/api/mcp/asset/11e8a4e9-d668-491b-b5d5-6c7dcb794022"
download mobile-mcp-artist-babyjake-hero "https://www.figma.com/api/mcp/asset/7f8cdae9-8b75-401a-b069-2d6e7ca6a4e5"
download mobile-mcp-artist-babyjake-photo "https://www.figma.com/api/mcp/asset/03e51f0e-3183-4f91-a312-0516b4e2942e"
