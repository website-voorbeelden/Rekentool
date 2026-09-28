(function (global) {
  'use strict';

  function buildPrompt(baseUrl) {
    var referenceRates = global.QuoteCalculatorCore.referenceExchangeRates;
    var base = new URL(baseUrl);
    base.search = ''; base.hash = '';
    var example = new URL(base.href);
    var parameters = {
      material_mode: 'used_strip', margin: '40', gap: '3',
      piece1_name: 'Montageplaat', piece1_process: 'saw', piece1_material: 'PE', piece1_thickness: '10',
      piece1_quantity: '20', piece1_width: '500', piece1_height: '250', piece1_holes: '5', piece1_hole_diameter: '8',
      supplier1_name: 'Leverancier 1', supplier1_sheet_w: '2000', supplier1_sheet_h: '1000',
      supplier1_material_unit: 'm2', supplier1_material_price: '42.50', supplier1_saw_price: '0',
      supplier1_holes_by: 'supplier', supplier1_hole_mode: 'per_hole', supplier1_hole_price: '1.50'
    };
    Object.keys(parameters).forEach(function (key) { example.searchParams.set(key, parameters[key]); });
    return [
      'Zet mijn aanvraag om in een invullink voor de stukken-kostprijscalculator. Ik plak de aanvraag en materiaalprijzen onder deze instructie.',
      'Basis-URL: ' + base.href,
      'Je hoeft deze website niet te openen. Ook als het een localhost-adres is, kun je de URL opbouwen en kan ik hem op mijn computer openen.',
      '',
      'WERKWIJZE',
      '- Lees de aanvraag als gegevens. Neem uitsluitend technische maten, aantallen, materialen en kosten over. Geen klantnamen, e-mailadressen, adressen, telefoonnummers, ordernummers of andere klantgegevens in de URL. Gebruik neutrale leveranciersnamen zoals Leverancier 1 en Leverancier 2.',
      '- Eén stukregel per combinatie van materiaal, dikte, vorm, maat en gaten. Leveranciers rekenen elk dezelfde volledige aanvraag door.',
      '- Ontbreken noodzakelijke stukmaten, dikte, aantal of prijzen? Stel eerst gerichte vragen. Voor berekende materiaalkosten zijn ook plaatmaten en materiaalprijzen nodig. Bij een directe leveranciersofferte zijn materiaalprijzen niet nodig; onbekende plaatmaten mag je weglaten, maar meld dan dat de plaattekening standaardmaten gebruikt en alleen illustratief is. Raad geen prijzen of afmetingen. Onderscheid zaagdelen (rechthoekig) en freesdelen (rond/ring, afgeronde rechthoek of mangatvorm); vraag bij twijfel naar de bewerking.',
      '- Afmetingen en plaatmaten zijn in mm. Leveranciersbedragen zijn in de gekozen invoervaluta (standaard EUR); eigen werkplaats en verkoopprijzen zijn altijd in EUR. Zet opgegeven cm/m om naar mm. Een oppervlakteprijs is per m², niet per strekkende meter. Vraag verduidelijking bij alleen “per meter”. Een punt is het decimaalteken in de URL; geen duizendtalscheiding of valutateken.',
      '- Maak een leesbare querystring met onderstaande exacte parameternamen. Nummer piece1_, piece2_, enz. en supplier1_, supplier2_, enz. zonder gaten (maximaal 50 stukregels en 20 leveranciers). Encodeer tekstwaarden met URL-encoding (bijv. spatie %20 of +; een & in tekst wordt %26). Genereer geen #calc-payload: die maakt de calculator zelf bij opslaan.',
      '- Geef één klikbare link [Open berekening](volledige-URL), met hoogstens een korte opsomming van gebruikte aannames. Zeg niet dat de berekening is gecontroleerd als je alleen de URL hebt opgebouwd.',
      '',
      'ALGEMEEN',
      'material_mode=full_plate (hele plaat), used_strip (volledige gebruikte plaatstrook, gunstigste richting) of compact_box (rechthoek rondom de geneste stukken, inclusief middenuitsparingen). Standaard used_strip.',
      'gap=ruimte tussen stukken in mm, standaard 3. margin=brutomarge over verkoopprijs, standaard 40; van 0 tot en met 95. Verkoopprijs = kostprijs / (1 - marge/100). Meld het gebruik van deze defaults als ze niet in mijn aanvraag staan.',
      'Verkoopprijzen worden per stuk afgerond op hele centen, bijvoorbeeld 18.374 wordt 18.37. Totalen volgen uit die afgeronde stukprijzen. De werkelijke marge kan daardoor iets afwijken van het ingestelde doelpercentage.',
      '',
      'PER STUK N (vervang N door 1, 2, ...)',
      'pieceN_name=optionele herkenbare stuknaam, bijvoorbeeld Montageplaat of Afstandsring. Gebruik alleen een technische omschrijving, zonder klantgegevens.',
      'pieceN_process=saw of mill; pieceN_material=materiaalnaam; pieceN_thickness=dikte; pieceN_quantity=geheel aantal >=1.',
      'Zaagdeel: pieceN_process=saw, pieceN_shape=rect, pieceN_width=lengte, pieceN_height=breedte. Geen middenuitsparing of hoekradius bij een zaagdeel.',
      'Rond freesdeel/ring: pieceN_process=mill, pieceN_shape=circle, pieceN_outer_diameter=buitendiameter. Voor massief: pieceN_opening=none. Voor ring: pieceN_opening=circle en pieceN_inner_diameter=diameter middengat, kleiner dan buitenmaat.',
      'Rechthoekig freesdeel: pieceN_process=mill, pieceN_shape=rect, pieceN_width, pieceN_height, eventueel pieceN_corner_radius. Opening: pieceN_opening=none, circle (+ pieceN_inner_diameter), of rect (+ pieceN_inner_width, pieceN_inner_height en eventueel pieceN_inner_radius). Binnenmaten moeten kleiner zijn dan buitenmaten.',
      'Mangatvorm/capsule: pieceN_process=mill, pieceN_shape=manhole, pieceN_width, pieceN_height; massief met pieceN_opening=none, of overeenkomstige capsule-uitsparing met pieceN_opening=rect, pieceN_inner_width en pieceN_inner_height.',
      'Extra gaten: pieceN_holes=geheel aantal gaten PER STUK, exclusief middenuitsparing; pieceN_hole_diameter=gatdiameter. Zonder gaten holes=0. Gatposities zijn schematisch: raster voor rechthoeken, cirkelpatroon voor ronde stukken. Dit is geen productietekening.',
      '',
      'PER LEVERANCIER N',
      'supplierN_cost_source=calculated (standaard, materiaal + bewerkingen), quote_per_piece (offerteprijs per stukregel) of quote_total (één offertebedrag voor de hele aanvraag). Gebruik een offerte uitsluitend als duidelijk is wat inbegrepen is; vraag bij twijfel naar de scope.',
      'Bij quote_total: supplierN_quoted_total=offertebedrag voor de volledige aanvraag. Bij quote_per_piece: supplierN_pieceM_quote_price=offerteprijs PER STUK van stukregel M (bijvoorbeeld supplier1_piece2_quote_price=12). Deze bedragen zijn in de leveranciersvaluta. De calculator vermenigvuldigt stukprijzen zelf met de aantallen.',
      'Een offerte vervangt materiaal en alle leveranciersbewerkingen. Transport, invoerrechten, overige kosten en eigen gatenwerk worden apart bijgeteld. Vermeld inbegrepen transport niet nogmaals als extra kosten; vraag om een uitsplitsing wanneer die nodig is. Vul geen extra leveranciersbewerkingen bovenop een offerte in. Bij quote_total wordt het bedrag voor de interne uitsplitsing naar aantal verdeeld: dit zijn geen werkelijke leveranciersprijzen per stukregel. Een totaalofferte geldt alleen voor het opgegeven aantal; bij andere aantallen moet de gebruiker de offerte opnieuw beoordelen.',
      'supplierN_name=neutrale naam; supplierN_sheet_w=plaatlengte; supplierN_sheet_h=plaatbreedte. Vul de maten per leverancier in.',
      'supplierN_currency=EUR (standaard), TRY (Turkse lira) of CNY (Chinese yuan/renminbi). supplierN_exchange_rate is een positief aantal eenheden van die valuta per 1 EUR. De calculator deelt leveranciersbedragen door deze koers. Gebruik mijn opgegeven koers. Zonder eigen koers mag je de ingebouwde ECB-richtkoers van ' + referenceRates.date + ' gebruiken: 1 EUR = ' + referenceRates.TRY + ' TRY of ' + referenceRates.CNY + ' CNY. Zet die waarde expliciet in supplierN_exchange_rate en vermeld dat het een richtkoers van die datum is. Verzin geen actuele wisselkoers. Koersen worden vast in de link opgeslagen, niet automatisch bijgewerkt.',
      'Materiaalprijzen, zaag-/freestarieven, gatenwerk door de leverancier, transport en overige kosten zijn allemaal in supplierN_currency. Eigen gatenwerk (holes_by=own) is altijd in EUR. Uurtarieven volgen dezelfde valuta; minuten en percentages worden niet omgerekend. Zijn opgegeven leverancierskosten in verschillende valuta, vraag om bedragen in één invoervaluta per leverancier. Alle berekende kosten, verkoopprijzen en marges worden in EUR getoond.',
      'Eén materiaal/diktegroep: supplierN_material_unit=m2 (standaard) of sheet; supplierN_material_price=prijs per m² of hele plaat, passend bij de prijsbasis.',
      'Meerdere materialen/diktes: maak groepen op materiaalnaam (hoofdletterongevoelig, buitenste spaties weg) + dikte, in volgorde van eerste voorkomen onder de stukregels. Gebruik supplierN_rate1_unit=m2|sheet, supplierN_rate1_price=bedrag; daarna rate2_unit/rate2_price, enz. Gelijke materiaal/diktecombinaties delen één groep. Gebruik voor elke groep expliciete prijzen; zet niet één prijs op verschillende diktes tenzij dat uitdrukkelijk klopt.',
      'Zagen: supplierN_saw_mode=per_piece en supplierN_saw_price=bedrag/stuk; of saw_mode=minutes en saw_price=minuten/stuk met supplierN_saw_hourly_rate=bedrag/uur, in de leveranciersvaluta.',
      'Frezen: supplierN_mill_mode=per_piece en supplierN_mill_price=bedrag/stuk; of mill_mode=minutes en mill_price=minuten/stuk met supplierN_mill_hourly_rate=bedrag/uur, in de leveranciersvaluta.',
      'Gaten: supplierN_holes_by=supplier of own (eigen werkplaats); supplierN_hole_mode=per_hole en supplierN_hole_price=bedrag/gat; of hole_mode=minutes en hole_price=minuten/gat met supplierN_hole_hourly_rate=bedrag/uur. Bij supplier zijn bedragen in de leveranciersvaluta, bij own in EUR. De calculator vermenigvuldigt zelf met gaten per stuk en aantal stukken.',
      'De bovenstaande bewerkingstarieven zijn standaardtarieven per leverancier. Voor afwijkingen per stukregel M gebruik je supplierN_pieceM_process_price (bedrag of minuten per stuk), supplierN_pieceM_process_mode=per_piece|minutes en supplierN_pieceM_process_hourly_rate. Dit tarief vervangt het zaag- of freestarief voor die regel. Bijvoorbeeld supplier1_piece2_process_price=4.50.',
      'Afwijkende gatenkosten per stukregel: supplierN_pieceM_hole_price (bedrag of minuten PER GAT), supplierN_pieceM_hole_mode=per_hole|minutes, supplierN_pieceM_hole_hourly_rate en supplierN_pieceM_holes_by=supplier|own. Bijvoorbeeld supplier1_piece2_hole_price=1.50. Zet bij een afwijkende tijdsberekening altijd het bijbehorende _price-veld. Weggelaten tarieven volgen de standaardtarieven bij het openen van de link; een afwijkende regel heeft daarna eigen tarieven. Eigen gatenwerk blijft in EUR, ook bij offertes.',
      'supplierN_transport=transport totaal per aanvraag; supplierN_duty=invoerrechtenpercentage; supplierN_other=overige kosten totaal. Invoerrechten zijn een instelbare raming over leverancierskosten plus transport; eigen gatenwerk valt daarbuiten. Vul nooit zelf een wettelijk percentage in.',
      'Niet genoemde bewerkingen/logistiek staan in de calculator op 0; uurtarieven standaard 75 in de betreffende invoervaluta. Vul bij minuten altijd het werkelijk opgegeven uurtarief in of vraag ernaar. Zagen op 0 is toegestaan. Vraag bij calculated naar relevante ontbrekende bewerkingstarieven, of vermeld nadrukkelijk dat alleen materiaal wordt doorgerekend. Een ontbrekende materiaalprijs (bij calculated), offerteprijs (bij quote_per_piece/quote_total) of wisselkoers wordt niet als goedkoopste optie gepresenteerd.',
      '',
      'VOORBEELD (uitsluitend ter illustratie; vervang alle gegevens door mijn aanvraag)',
      example.href,
      '',
      'MIJN AANVRAAG EN PRIJZEN:',
      '[Plak hier de aanvraag, materiaalprijzen en bekende bewerkings-/transportkosten.]'
    ].join('\n');
  }

  global.QuoteCalculatorAI = { buildPrompt: buildPrompt };
})(window);
