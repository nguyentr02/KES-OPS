// Drink name → photo path under ops /public/menu (copied from the website).
// One photo per drink; both sizes (S/M) share it. Missing name → fallback tile.
const SLUGS: Record<string, string> = {
  "Cà Phê Đen": "ca-phe-den",
  "Cà Phê Sữa SG": "ca-phe-sua-sg",
  "Cà Phê Muối": "bac-xiu", // tạm dùng ảnh bạc xỉu
  "Cà Phê Kem Bơ Đậu Phộng": "ca-phe-kem-bo-dau-phong",
  "Bạc Xỉu": "bac-xiu",
  "Bạc Xỉu Muối": "bac-xiu", // tạm dùng ảnh bạc xỉu
  "Cold Brew": "cold-brew",
  "Cold Brew Chai": "cold-brew-chai",
  "Cold Brew Chanh Vàng": "cold-brew-chanh-vang",
  "Cold Brew Cam": "cold-brew-cam",
  "Cold Brew Tonic": "cold-brew-tonic",
  "Trà Chanh Vàng Macchiato": "cold-brew-tonic", // tạm dùng ảnh cold brew tonic
  "Cà Phê Đen Chai": "cold-brew-chai", // tạm dùng ảnh chai
  "Cacao Latte": "cacao-latte",
  "Cacao Muối": "bac-xiu-muoi", // tạm dùng ảnh — thay ảnh thật sau
  "Matcha Latte": "matcha",
  "Matcha Cold Whisk": "matcha",
};

export function productImage(name: string): string | null {
  const slug = SLUGS[name];
  return slug ? `/menu/${slug}.jpg` : null;
}
