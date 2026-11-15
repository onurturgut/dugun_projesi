import test from "node:test";
import assert from "node:assert/strict";
import {
  businessStorefrontInput,
  defaultStorefront,
  publicBusiness,
  storefrontPublicationIssues,
} from "../src/lib/business-directory";
import type { Partner } from "../src/lib/models";

const partner: Partner = {
  id: "business-1",
  name: "Örnek İşletme",
  phone: "05321234567",
  address: "Örnek açık adres",
  logo_url: "/covers/couple-1.jpg",
  active: true,
  created_at: "2026-11-14T00:00:00.000Z",
  business_types: ["photography", "florist"],
};

test("legacy active businesses remain publicly discoverable without leaking contact data", () => {
  const result = publicBusiness(partner);
  assert.equal(result?.name, partner.name);
  assert.deepEqual(result?.business_types, ["photography", "florist"]);
  assert.equal(result?.phone, null);
  assert.equal(result?.whatsapp_phone, null);
  assert.equal(result?.address, null);
});

test("draft and suspended storefronts are not public", () => {
  const storefront = defaultStorefront(partner);
  assert.equal(publicBusiness({ ...partner, storefront }), null);
  assert.equal(
    publicBusiness({
      ...partner,
      storefront: { ...storefront, status: "suspended" },
    }),
    null,
  );
});

test("published storefront exposes only explicitly enabled contact fields", () => {
  const storefront = {
    ...defaultStorefront(partner),
    slug: "ornek-isletme",
    status: "published" as const,
    show_phone: true,
  };
  const result = publicBusiness({ ...partner, storefront });
  assert.equal(result?.slug, "ornek-isletme");
  assert.equal(result?.phone, partner.phone);
  assert.equal(result?.address, null);
});

test("storefront input rejects unknown fields and unsafe links", () => {
  const input = {
    ...defaultStorefront(partner),
    cover_images: ["javascript:alert(1)"],
    unknown: true,
  };
  assert.equal(businessStorefrontInput.safeParse(input).success, false);
});

test("publishing requires a meaningful description, category and service city", () => {
  const storefront = defaultStorefront(partner);
  assert.deepEqual(storefrontPublicationIssues(partner, storefront), [
    "Kısa açıklama en az 20 karakter olmalı.",
    "En az bir hizmet şehri gerekli.",
  ]);
  assert.deepEqual(
    storefrontPublicationIssues(partner, {
      ...storefront,
      short_description:
        "Özel günlere profesyonel fotoğraf ve dekorasyon hizmeti.",
      service_cities: ["Elazığ"],
    }),
    [],
  );
});
