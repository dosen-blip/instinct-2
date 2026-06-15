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

download home-hero "https://www.figma.com/api/mcp/asset/e141610b-aa02-43de-ae78-d1db86447eac"
download home-preview "https://www.figma.com/api/mcp/asset/840a7f3d-0a54-4fde-914c-37030f3d851e"
download home-next-poster "https://www.figma.com/api/mcp/asset/b6b26b35-45c7-48c5-97b4-bcc336328797"
download home-team "https://www.figma.com/api/mcp/asset/25dc65b4-0865-4194-b59b-c4a7c1e78061"
download home-vol1-thumb "https://www.figma.com/api/mcp/asset/ecc95e7f-46af-4009-bf37-ffeb5f611eb1"
download home-vol2-thumb "https://www.figma.com/api/mcp/asset/a2d14461-21d1-438d-8bd1-b1d29586dc30"
download home-vol3-thumb "https://www.figma.com/api/mcp/asset/6cf32fce-804a-4221-a00e-3b47ce22d076"
download home-tickets "https://www.figma.com/api/mcp/asset/39645acf-749f-4982-9e91-fbd1323445d8"

download next-backdrop "https://www.figma.com/api/mcp/asset/0f557617-c052-455b-ae47-cf8094108d0d"
download next-ty "https://www.figma.com/api/mcp/asset/8cc0f2e0-73dd-4d14-ac30-99f4b512b120"
download next-seb "https://www.figma.com/api/mcp/asset/07137d80-e42f-49b9-9ef0-45e56788ee7d"
download next-dose "https://www.figma.com/api/mcp/asset/cd9b7744-981b-4b1e-8a07-7a0967ff56ef"
download drink-melon "https://www.figma.com/api/mcp/asset/c0cef22b-b5b9-4596-ac43-fc29a49eddb8"
download drink-scooby "https://www.figma.com/api/mcp/asset/7f53320f-92b1-4cd5-af9d-9c23f75c606a"

download vol1-photo1 "https://www.figma.com/api/mcp/asset/2f27d814-4796-41f6-88a5-633e1804d1b0"
download vol1-photo2 "https://www.figma.com/api/mcp/asset/aa172fb1-1562-435b-a8c1-42765d1751ce"
download vol1-photo3 "https://www.figma.com/api/mcp/asset/9f14d2fe-0f85-4357-bc2c-32effe538fa3"
download vol1-photo4 "https://www.figma.com/api/mcp/asset/21df4c96-0859-4bed-a853-b49d68cf4101"
download vol1-photo5 "https://www.figma.com/api/mcp/asset/6aad6a91-13ad-40ef-a756-d607e7382b6c"
download vol1-photo6 "https://www.figma.com/api/mcp/asset/4fec4cc8-9061-49d0-866c-366b478363e5"
download vol1-photo7 "https://www.figma.com/api/mcp/asset/f5000921-e9c7-4be4-9a4c-8cb9f8a8c22f"
download vol1-lineup-viq "https://www.figma.com/api/mcp/asset/2f44202c-be97-40ea-a76d-af6192f7a5eb"
download vol1-lineup-danford "https://www.figma.com/api/mcp/asset/1715f40d-e76a-4b11-9349-62cc255e7534"
download vol1-lineup-zaq "https://www.figma.com/api/mcp/asset/3d4e7da8-518a-439d-b1f9-b124360f20cf"

download vol2-photo1 "https://www.figma.com/api/mcp/asset/1ad8396c-a08a-47b6-9bd2-ab3e2463e6a1"
download vol2-photo2 "https://www.figma.com/api/mcp/asset/aca6081c-d753-4fa6-bbdd-952c6b349312"
download vol2-photo3 "https://www.figma.com/api/mcp/asset/28500967-8c46-4e59-801a-ced681c4274f"
download vol2-photo4 "https://www.figma.com/api/mcp/asset/dbce00db-b666-4328-9c7a-a297e18ff79b"
download vol2-photo5 "https://www.figma.com/api/mcp/asset/0eaa9086-bb98-46fe-9a49-7ed73f08f4d4"
download vol2-photo6 "https://www.figma.com/api/mcp/asset/380628e2-b6a8-487d-b366-7c0ff27f3036"
download vol2-photo7 "https://www.figma.com/api/mcp/asset/50d44a25-f378-4157-b531-8100f1a73950"
download vol2-lineup-macd "https://www.figma.com/api/mcp/asset/44e1133a-6858-42bf-80b0-7562d1fbf044"
download vol2-lineup-chefnier "https://www.figma.com/api/mcp/asset/05f851a0-4363-4460-8ad1-fbcc6f851d11"
download vol2-lineup-benvi "https://www.figma.com/api/mcp/asset/4deab824-09ed-420b-8776-fb4e9bcccac4"

download vol3-photo1 "https://www.figma.com/api/mcp/asset/29faf935-eb92-4d90-b390-1e852765fa55"
download vol3-photo2 "https://www.figma.com/api/mcp/asset/536b954b-5ee9-4b22-9f52-01fa92c63824"
download vol3-photo3 "https://www.figma.com/api/mcp/asset/dd12fb87-e966-48f1-8225-186a6288e87b"
download vol3-photo4 "https://www.figma.com/api/mcp/asset/2c664003-a456-467e-a6c1-c95754824eaa"
download vol3-photo5 "https://www.figma.com/api/mcp/asset/2f094187-1161-495a-b382-d920f6d9851b"
download vol3-photo6 "https://www.figma.com/api/mcp/asset/e071eefc-9dd0-4553-9b2c-8cb56e9aafe3"
download vol3-photo7 "https://www.figma.com/api/mcp/asset/bd1413d4-5193-426c-9fd7-e4c05cb743a0"
download vol3-photo8 "https://www.figma.com/api/mcp/asset/ab26a8d6-8ed1-4091-ae11-a6a258cdd6b1"
download vol3-photo9 "https://www.figma.com/api/mcp/asset/26f711f4-e6a9-4b96-a677-7cc8aca684ee"
download vol3-lineup-50nic "https://www.figma.com/api/mcp/asset/be80d811-b928-491b-b85d-bb1c5631d0f8"
download vol3-lineup-comfort "https://www.figma.com/api/mcp/asset/cadc02ac-7e69-4c03-9c7a-fa48275f4622"
download vol3-lineup-babyjake "https://www.figma.com/api/mcp/asset/e8d0b7aa-3746-4779-ae3e-9cf62a3e1625"

download ty-portrait "https://www.figma.com/api/mcp/asset/c748f19a-c382-476d-b85d-0d3d37155840"
download ty-band "https://www.figma.com/api/mcp/asset/527a25e8-d6e6-4bae-a61a-fb3d48e08ef0"
download ty-lower "https://www.figma.com/api/mcp/asset/6d20b01c-07db-40f7-89ae-df28b5b9cc78"
download seb-portrait "https://www.figma.com/api/mcp/asset/63c45ed8-e077-4d08-bf11-4a1c1e242771"
download seb-band "https://www.figma.com/api/mcp/asset/a7500a55-691d-45c1-9c8c-27c27d05622d"
download seb-lower "https://www.figma.com/api/mcp/asset/f6dfcd37-3cfe-46cb-95df-485881f266f5"
download dose-portrait "https://www.figma.com/api/mcp/asset/9f73bfc2-e4cb-4dea-99d0-c46b5bc56997"
download dose-band "https://www.figma.com/api/mcp/asset/31176711-8f6b-4ed2-be36-9a980dab2cb6"
download dose-lower "https://www.figma.com/api/mcp/asset/bbfb77f5-4b7c-46de-8c87-ffe6f53e0591"
