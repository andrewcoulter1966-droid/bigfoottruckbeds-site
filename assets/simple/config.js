/* Ad tracking switches for bigfoottruckbeds.com. BOTH ARE OFF while the value between the quotes is empty.

   To turn one on, put its ID between the quotes on the last line, save, and publish (deploy\deploy.cmd):
     metaPixelId   the Meta (Facebook) Pixel ID, numbers only         example  "1234567890123456"
     ga4Id         the Google Analytics 4 Measurement ID              example  "G-ABC123DEF4"

   Nothing else has to change. The page's security policy already allows both, the build adds the matching
   paragraph to the privacy page, and the page then sends: PageView when it opens, Lead when the quote form
   is sent, Contact when a call button is tapped. Neither loads for a visitor whose browser asks not to be tracked.

   The site's own visit counting (no cookies, read at the portal's /stats page) is separate and always on. */
window.BF_TRACK = { metaPixelId: "", ga4Id: "G-30NXG3DJPB" };
