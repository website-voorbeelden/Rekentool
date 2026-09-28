# Stukken kostprijscalculator

De hoofdpreview in `index.html` is een algemene kostprijscalculator voor zaag- en freesdelen. De bestaande pakkingcode blijft als losse legacy-module beschikbaar voor ring-, pakking- en contourgeometrie.

## Nieuwe hoofdstructuur

- `assets/quote-calculator-core.js`: centraal aanvraagmodel, berekeningen en URL-import/export.
- `assets/quote-calculator.js`: interface voor stukken en volledige leveranciersscenario's.
- `assets/quote-calculator-view.js`: werkt bestaande elementen bij met behoud van invoervelden, open panelen en de schermpositie van het actieve veld.
- `assets/quote-calculator.css`: nieuwe interface.
- `assets/quote-calculator-preview.js`: stuk- en plaattekeningen.
- `assets/quote-calculator-chart.js` en `assets/quote-calculator-chart-worker.js`: hoeveelheidsgrafiek, berekend buiten de hoofdinterface.
- `assets/quote-calculator-ai.js`: kopieerbare instructie voor AI-gegenereerde invullinks.
- `assets/gasket-configurator-nesting.js`: bestaande nestingmodule, hergebruikt zonder de oude pakkinginterface te laden.

De oude `gasket-configurator-*` interfacebestanden blijven intact voor hergebruik in Shopify en voor de bestaande freesvormen.

## URL-invoer

De calculator accepteert leesbare parameters voor AI-gegenereerde links, bijvoorbeeld:

```text
?material_mode=compact_box&piece1_process=saw&piece1_material=PE&piece1_thickness=10&piece1_quantity=20&piece1_width=500&piece1_height=250&piece1_holes=5&supplier1_name=Lokaal&supplier1_sheet_w=2000&supplier1_sheet_h=1000&supplier1_material_unit=m2&supplier1_material_price=42.50&supplier1_hole_price=1.50
```

De knop `Berekeningslink kopiëren` onder de prijsbediening maakt een compacte `#calc=`-link met de volledige actuele invoer.

Helemaal bovenaan kopieert `AI-prompt kopiëren` de volledige URL-specificatie, met voorbeeld voor de huidige locatie van de calculator. De instructie bevat geen aanvraag- of klantgegevens. Plak deze samen met de aanvraag en prijzen in een AI-chat. De specificatie behandelt eenheden, ontbrekende informatie, freesvormen, meerdere materiaal/diktegroepen en bewerkingen. `gap` vult de nestingafstand in; `supplierN_holes_by=own|supplier` kiest wie de extra gaten maakt. `pieceN_name` is een optionele technische stuknaam die ook in de prijsbediening, stukvelden en plaatlegenda verschijnt; oude links zonder naam tonen Stuk 1, Stuk 2, enz.

Elk stuk heeft `pieceN_process=saw|mill`. Iedere leverancier heeft eigen plaatmaten (`supplierN_sheet_w`, `supplierN_sheet_h`, in mm), en afzonderlijke zaag- en freestarieven (`supplierN_saw_price`, `supplierN_mill_price`). De bijbehorende `_mode` is `per_piece` of `minutes`; `_hourly_rate` geldt bij minuten. De oude globale parameters `process`, `sheet_w` en `sheet_h` blijven als standaardwaarden ondersteund. Nesting en materiaalkosten worden per leverancier berekend; onderaan kies je de leverancier voor de plaatpreview.

## Kosten en bediening

Bij iedere leverancier kies je **Materiaal + bewerkingen**, **Offerte per stuk** of **Offerte totaal**. Een offerteprijs per stuk wordt per stukregel ingevuld en met het aantal vermenigvuldigd; een totaalofferte is één vast bedrag voor de volledige aanvraag. Offertebedragen volgen de leveranciersvaluta. Ze vervangen materiaal en alle leveranciersbewerkingen, zodat die kosten niet dubbel meetellen. Transport, invoerrechten, overige kosten en eventueel eigen gatenwerk komen apart erbij. Bij een totaalofferte verdeelt de stukregeltabel het bedrag naar aantal; dit is een toerekening en geen geoffreerde prijs per afzonderlijke regel. Een ander aantal verandert de totaalofferte niet: de gebruiker moet dan het offertebedrag opnieuw beoordelen. De plaatindeling is bij offertes alleen illustratief.

Leesbare URL-velden: `supplierN_cost_source=calculated|quote_per_piece|quote_total`, `supplierN_quoted_total` en `supplierN_pieceM_quote_price` (prijs per stuk van regel M). Oude links zonder deze velden gebruiken de bestaande berekende kosten. De nieuwe velden staan in de AI-prompt en in opgeslagen berekeningslinks.

Onder **Bewerkingskosten → Tarieven per stukregel** kan een regel eigen zaag-/freestarieven en gatentarieven krijgen. Standaard volgen regels de algemene tarieven; bij inschakelen van afwijkende tarieven worden deze overgenomen en daarna onafhankelijk bewaard. Direct bedrag en minuten × uurtarief blijven beide beschikbaar, net als gaten door leverancier of eigen werkplaats. Bij offertes zijn leveranciersbewerkingen inbegrepen; alleen eigen gatenwerk kan er apart bijkomen. Leesbare URL-overrides gebruiken `supplierN_pieceM_process_price`, `_process_mode`, `_process_hourly_rate`, `_hole_price`, `_hole_mode`, `_hole_hourly_rate` en `_holes_by`. Deze verwijzen naar dezelfde stukregel M als de geometrie.

Verkoopprijzen worden werkelijk per stuk afgerond op hele centen: €18,374 wordt €18,37. Regeltotalen zijn afgeronde stukprijs × aantal; het verkooptotaal is de som van de regels. De werkelijke marge gebruikt dit totaal. Een ingesteld margepercentage, margebedrag of verkooptotaal is daardoor een doel dat door centafronding iets kan afwijken; de interface vermeldt de werkelijke marge en het afrondingsverschil.

Offertes per stuk kunnen in de hoeveelheidsgrafiek worden vergeleken met gelijkblijvende stukprijzen. Totaaloffertes worden daar met uitleg weggelaten, omdat ze alleen gelden voor het opgegeven aantal. De kostenbalken en leveranciersvergelijking voor het huidige aantal tonen beide offertemethoden wel, met een aparte post **Offerte leverancier**.

De prijsbediening staat bovenaan: kostprijs, verkoopprijs en marge. Bij één stukregel zijn ook verkoopprijs, marge en aantal per stuk direct instelbaar; meerdere regels krijgen afzonderlijke prijsvelden in een tabel met herkenbare vorm- en maatbeschrijvingen. Totale prijs- of margewijzigingen vervangen eventuele regelinstellingen. Het gemarkeerde prijsveld is de laatst gekozen grootheid en blijft vaststaan bij gewijzigde kosten. Financiële wijzigingen gebruiken de bestaande nesting opnieuw.

Namen, aantallen, materiaal, dikte en buitenmaten zijn ook direct in de overzichten te wijzigen. Dezelfde gegevens blijven gekoppeld aan de detailvelden; focus blijft bij het veld waarin je typt. Scrollen over een actief getalveld haalt de focus uit dat veld, zodat de pagina gewoon scrolt en de waarde niet verandert. De pijltjes gebruiken stap 1; handmatig ingevoerde decimalen worden bij prijzen en maten geaccepteerd. Stukken en leveranciers krijgen vaste kleuren die terugkomen in prijsregels, tekeningen en grafieken. Kleuren, prijsinstellingen, gekozen leverancier en nestingkeuzes worden in de berekeningslink bewaard.

Tijdens invoer worden bestaande elementen bijgewerkt in plaats van de hele pagina te vervangen. Het actieve veld blijft verbonden met de pagina; de getypte tekst, selectie, open panelen en horizontale tabelscroll blijven behouden. Hoogtewijzigingen boven een zichtbaar actief veld worden gecompenseerd zodat dat veld op dezelfde schermpositie blijft. De lijngrafiek houdt tijdens herberekenen de vorige tekening met een melding zichtbaar, met gereserveerde ruimte voor de eerste berekening. Ook de asynchrone grafiekupdate bewaart de positie van een actief invoerveld.

Bij toevoegen van een leverancier, stuk of alternatief met eigen gatenwerk verschijnt de nieuwe regel op de schermpositie van de aangeklikte knop. Het naamveld krijgt focus zonder opnieuw te scrollen. De leveranciersvergelijking wordt daarbij niet automatisch opengeklapt. Ook actieve knoppen en het verdwijnen van tijdelijke meldingen vallen onder het behoud van de schermpositie.

Onder de prijsbediening staat de kostenverdeling per volledig ingevulde leverancier: een gestapelde balk met materiaal, bewerking leverancier, eigen gatenwerk, transport, invoerrechten en overig. Alle balken gebruiken dezelfde euroschaal, met de hoogste totale kostprijs als maximum. Bedragen en percentages zijn zonder hover leesbaar; de percentages blijven het aandeel in de eigen leverancierskostprijs. Nulposten worden weggelaten.

De kostprijskaart toont materiaal, bewerking en transport apart als bedragen voor de hele aanvraag, aangevuld met invoerrechten en overige kosten wanneer ingevuld. Bij één stuksoort staat ernaast ook het bedrag per stuk. De totale kostprijs en marge omvatten alle kosten. Transport is één bedrag per aanvraag; het bedrag per stuk is de toegerekende fractie en wordt bij een gewijzigd aantal opnieuw verdeeld.

De stukregeltabel toont onder **Stukkosten / st.** en **Stukkosten totaal** uitsluitend materiaal en bewerking. Bij ingevulde transport-, invoer- of overige kosten staat hun toegerekende aandeel apart onder **Bijkomend / st.** De marge wordt berekend als verkoop min stukkosten min bijkomende kosten. Ook bij één stuksoort toont de prominente stukkostprijs alleen materiaal en bewerking; het aanvraagbedrag bovenaan blijft inclusief alle kosten. Deze uitsplitsing verandert de rekenformules of bestaande verkoopinstellingen niet.

Daarna verschijnt bij meerdere scenario's de leveranciersvergelijking. De vergelijking bij gelijke verkoopprijs wijzigt de eigen verkoopprijzen van scenario's niet. De prijs- en vergelijkingstabellen hebben vaste kolommen en dunne rasterlijnen; witte cellen zijn invoervelden, grijze cellen zijn berekende uitkomsten. Ontbrekende of nul-materiaalprijzen worden als onvolledig aangeduid en komen niet als goedkoopste leverancier naar voren; gratis zagen blijft toegestaan.

Materiaalprijzen staan ook direct in de ingeklapte leveranciersregel, per materiaal/diktegroep en met zichtbare valuta en prijsbasis per m² of per plaat. De prijsbasis kun je in de details wisselen; beide prijsvelden blijven gekoppeld.

Per leverancier kun je direct in de ingeklapte regel **EUR**, **TRY (Turkse lira)** of **CNY (Chinese yuan)** kiezen. De koers staat klaar als **1 EUR = … TRY/CNY** en blijft handmatig aanpasbaar. De standaard is de ECB-richtkoers van **25-09-2026**: **55,7975 TRY** of **7,6551 CNY** per EUR. Onder het koersveld staat ook hoeveel één lira/yuan in euro waard is. Positieve eigen en opgeslagen koersen blijven behouden; eerder leeg opgeslagen buitenlandse koersen krijgen bij openen de richtkoers. Materiaal, leveranciersbewerkingen, transport en overige kosten worden in die invoervaluta ingevoerd en voor de berekening door de koers gedeeld. Eigen gatenwerk blijft in EUR. Uitkomsten, grafieken, plaatkosten, verkoopprijzen en marges blijven in EUR. Zonder positieve koers wordt de leverancier niet als geldige vergelijking getoond. De valutakeuze verandert de eenheid van de bestaande tariefgetallen; die getallen blijven staan. Een eerder ingevulde koers wordt per valuta onthouden.

Bronnen voor de richtkoersen: [ECB – Turkse lira](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-try.en.html) en [ECB – Chinese yuan](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-cny.en.html).

Leesbare links gebruiken `supplierN_currency=EUR|TRY|CNY` en `supplierN_exchange_rate` (eenheden vreemde valuta per EUR). Beide staan in de AI-instructie en worden samen met de aanvraag in opgeslagen links bewaard. Oude links zonder valutavelden gebruiken EUR. Er is geen automatische koersverversing.

Bij twee volledig ingevulde leveranciers toont een lijngrafiek de kostprijs per stuk bij verschillende aantallen. Gemengde aanvragen houden dezelfde aantalsverhouding; de grafiek benoemt dan de gemiddelde kostprijs. Er worden maximaal zeven aantallen bemonsterd, tot 2.000 stukken per meetpunt. Tussenliggende aantallen kunnen afwijken door plaatgebruik. De tarieven blijven gelijk, zonder staffelkorting; transport en overige kosten blijven per aanvraag gelijk. Het huidige aantal behoudt de gekozen plaatindeling; andere aantallen gebruiken automatisch de voordeligste gevonden indeling. Een worker voorkomt dat de extra berekeningen de invoervelden blokkeren.

Daarna volgen afzonderlijke secties voor stukken en leveranciers, met inklapbare regels. Binnen een stuk staan eerst type, aantal, materiaal en dikte. Daaronder staan de vormvelden links en de schematische stukpreview rechts (vanaf 900 pixels schermbreedte); op smallere schermen volgt de preview onder de velden. Nieuwe stukken openen automatisch. Gatdiameter en gatentarieven verschijnen alleen als er extra gaten zijn; bestaande invoer blijft bij verbergen bewaard.

Binnen een leverancier staan naam, materiaal (plaatmaten en prijzen), relevante bewerkingen en inklapbare logistiek achter elkaar. Via deze sectie kan een alternatief met eigen gatenwerk worden aangemaakt; controleer het overgenomen of eerder opgeslagen gatentarief. De plaatpreview staat helemaal onderaan, samen met materiaalberekenmethode en tussenruimte. `Opnieuw indelen` doorloopt de verschillende gevonden indelingen per materiaal/diktegroep en leverancier; de extra materiaalprijs is zichtbaar. `Voordeligste indeling` zet de keuze terug. Bij geometriewijzigingen wordt opnieuw automatisch de voordeligste gevonden indeling gekozen. Dit is een vergelijking van heuristische indelingen, geen garantie op het wiskundige optimum.

Extra gaten staan in een raster bij rechthoekige stukken en capsules, en in een cirkel bij ronde stukken/ringen. Middenuitsparingen en afgeronde randen worden waar mogelijk ontweken. Bij onvoldoende ruimte meldt het vormvoorbeeld hoeveel gaten zichtbaar zijn; aantallen blijven leidend voor kosten. Gatposities zijn schematisch.

De stukregeltabel verdeelt materiaalverlies naar buitenmaat × aantal binnen dezelfde materiaal/diktegroep. Transport en overige kosten worden naar directe kostprijs verdeeld; bij nul directe kosten naar aantallen. Invoerrechten per regel worden berekend over leverancierskosten plus het toegerekende transport, zonder eigen gatenwerk. Dit is een expliciete kostentoerekening, geen afzonderlijke leveranciersofferte per stukregel of douaneberekening.

Reken-, URL-, grafiek-, raster- en bedieningscontroles uitvoeren: `node --test tests/*.test.cjs`.

---

## Bestaande pakkingmodule

## Active files

- `gasket-configurator.css`
- `gasket-configurator-nesting.js`
- `gasket-configurator-drawing.js`
- `gasket-configurator.js`

## Do not keep loading

Do not load the old labor override script anymore. Its extra labor fields and price interception are now covered by `gasket-configurator.js`, and keeping the override can block the main calculator click handler.

## Result changes

- The result view now starts with a compact commercial summary.
- The old detailed technical calculation is still available under `Uitgebreide berekening tonen`.
- Total sale price, margin percent, and margin euro can be edited live.
- Per-gasket prices update live when sale price or margin changes.
- Rest-material display responds to the selected remainder mode.

## Shape changes

- Step 2 becomes shape-first: round, rectangle/square, or manhole gasket.
- Shape choice uses clickable icon tiles instead of a plain dropdown.
- Round keeps the existing OD/ID and optional bolt pattern flow.
- Rectangle/square supports outer width/height, outer radius, and either a round or rectangular inner hole.
- Manhole supports outer width/height and inner width/height as the same capsule-style shape, which matches the expected manhole gasket flow.
- Material area and cut length are calculated from the selected contour.
- Nesting uses the shape bounding width/height, so rectangular and manhole gaskets no longer behave like oversized circles.
- DXF/SVG export supports the new outer and inner contours.

Current limitation: bolt holes are still only enabled for round gaskets. Rectangular or manhole bolt patterns need a separate UX decision: circular bolt pattern, rectangular bolt pattern, or manual positions.

## Replace in Shopify

Replace these four theme assets:

- `assets/gasket-configurator.js`
- `assets/gasket-configurator.css`
- `assets/gasket-configurator-nesting.js`
- `assets/gasket-configurator-drawing.js`

Leave `assets/gasket-configurator-labor-override.js` unused.

Use this in the Shopify custom Liquid block:

```liquid
{% render 'gasket-configurator', product: product %}
```

## Checks run

- JavaScript syntax check for all three JS assets.
- Local nesting calculation check for mixed gasket rules and used-strip material mode.
- Local nesting check for rectangle and manhole gasket rules.

## Publiceren op GitHub Pages

Een push naar `main` voert de controles uit en publiceert `index.html` met de benodigde bestanden uit `assets/`. De site gebruikt relatieve assetpaden en werkt daardoor op de projectsite `https://website-voorbeelden.github.io/Rekentool/`. Schakel in de repository-instellingen bij **Pages** de bron **GitHub Actions** in voordat de eerste deployment draait. De deploymentworkflow kan ook handmatig worden gestart via **Actions**.
