"""
Generate 2000 training examples using keywords from threatDetection.js
Based on official police classification criteria
"""

import pandas as pd
import random

# Extract keywords from threatDetection.js
ENGLISH_KEYWORDS = [
    'weapon', 'gun', 'knife', 'bomb', 'explosive', 'firearm', 'pistol', 'rifle',
    'shotgun', 'ammunition', 'bullet', 'threat', 'threaten', 'kill', 'murder',
    'assault', 'attack', 'violence', 'violent', 'dangerous', 'harm', 'injure',
    'hostage', 'kidnap', 'terrorist', 'terrorism', 'suicide', 'bombing', 'shooting',
    'stabbing', 'fighting', 'brawl', 'riot', 'mob', 'gang', 'drugs', 'drug',
    'cocaine', 'heroin', 'meth', 'marijuana', 'weed', 'illegal', 'contraband',
    'rape', 'sexual assault', 'molest', 'abuse', 'torture',
    'extortion', 'bribery', 'corruption', 'smuggling',
    'human trafficking', 'trafficking', 'prostitution',
    'illegal gambling', 'drug dealing', 'drug trade', 'drug trafficking',
    'drug lord', 'drug cartel', 'drug syndicate', 'drug mule',
    'drug laboratory', 'drug lab', 'drug den', 'drug house',
    'drug user', 'drug addict', 'addict', 'overdose',
    'drug abuse', 'drug addiction', 'drug dependency'
]

FILIPINO_KEYWORDS = [
    'baril', 'kutsilyo', 'bomba', 'pamamaril', 'pagpatay', 'pumatay', 'patayin',
    'saksak', 'saksakin', 'sinaksak', 'sugat', 'sugatan', 'bugbog', 'bugbugin', 'away',
    'awayin', 'gulo', 'guluhin', 'karahasan', 'mapanganib', 'delikado',
    'takot', 'katakutan', 'banta', 'bantaan', 'pananakot', 'takutan',
    'kidnapin', 'terorista', 'terorismo', 'pagsabog', 'pagpapasabog',
    'droga', 'gamot', 'shabu', 'kontrabando', 'pusher',
    'kriminal', 'krimen', 'magnanakaw', 'nakaw', 'nakawin',
    'holdap', 'holdapin', 'rapein', 'molestin', 'abusuhin',
    'torturin', 'pagpapahirap', 'kotong', 'kotongan', 'lagay', 'lagayan',
    'korupsyon', 'smugglin', 'prostitusyon', 'sugal', 'sugalan', 'jueteng',
    'adik', 'adikan'
]

LOCATIONS = [
    'barangay', 'kapitbahayan', 'commercial district', 'residential area',
    'mall', 'church', 'school', 'park', 'market', 'building', 'apartment',
    'street corner', 'kanto', 'neighborhood', 'community center'
]

LOCATIONS_FILIPINO = [
    'barangay', 'kapitbahayan', 'komersyal na distrito', 'residential area',
    'mall', 'simbahan', 'paaralan', 'park', 'palengke', 'gusali', 'apartment',
    'kanto', 'kapitbahayan', 'community center'
]

def create_immediate_examples():
    """Generate Immediate severity examples (in-progress serious crimes)"""
    examples = []
    
    # High-priority keywords for Immediate
    immediate_keywords = ['kill', 'murder', 'pagpatay', 'pumatay', 'shooting', 'pamamaril', 
                         'bomb', 'bomba', 'hostage', 'kidnap', 'kidnapin', 'assault', 'attack',
                         'rape', 'rapein', 'violence', 'karahasan', 'weapon', 'gun', 'baril',
                         'stabbing', 'saksak', 'saksakin', 'terrorist', 'terorista']
    
    templates_en = [
        "{keyword} in progress at {loc}. Suspect actively harming victim.",
        "Active {keyword} happening at {loc}. Victim in immediate danger.",
        "{keyword} incident at {loc}. Suspect still present and armed.",
        "Ongoing {keyword} at {loc}. Multiple victims involved.",
        "Active {keyword} situation at {loc}. Immediate response required.",
        "{keyword} attack in progress at {loc}. People trapped inside.",
        "Suspect with {keyword} threatening people at {loc}. Active threat.",
        "In-progress {keyword} at {loc}. Emergency response needed.",
        "{keyword} happening now at {loc}. Victims need immediate help.",
        "Active {keyword} crime at {loc}. Suspects still at scene.",
    ]
    
    templates_fil = [
        "May nangyayaring {keyword} sa {loc}. Aktibong sinasaktan ng suspetsado ang biktima.",
        "May aktibong {keyword} na nangyayari sa {loc}. Nasa agarang panganib ang biktima.",
        "May insidente ng {keyword} sa {loc}. May armas pa ang suspetsado at nandiyan pa.",
        "May patuloy na {keyword} sa {loc}. Maraming biktima ang kasama.",
        "May aktibong {keyword} na sitwasyon sa {loc}. Kailangan ng agad na tugon.",
        "May pag-atake ng {keyword} na nangyayari sa {loc}. Naipit ang mga tao sa loob.",
        "May suspetsado na may {keyword} na nagbabanta sa mga tao sa {loc}. Aktibong banta.",
        "May nangyayaring {keyword} sa {loc}. Kailangan ng emergency response.",
        "May {keyword} na nangyayari ngayon sa {loc}. Kailangan ng agad na tulong ang mga biktima.",
        "May aktibong {keyword} na krimen sa {loc}. Nandiyan pa ang mga suspetsado.",
    ]
    
    for i in range(500):  # 500 Immediate examples
        if i < 250:  # 50% English
            template = random.choice(templates_en)
            keyword = random.choice(immediate_keywords)
            loc = random.choice(LOCATIONS)
            desc = template.format(keyword=keyword, loc=loc)
            examples.append({'description': desc, 'severity': 'Immediate'})
        else:  # 50% Filipino
            template = random.choice(templates_fil)
            keyword = random.choice([k for k in immediate_keywords if k in FILIPINO_KEYWORDS or k in ENGLISH_KEYWORDS])
            loc = random.choice(LOCATIONS_FILIPINO)
            desc = template.format(keyword=keyword, loc=loc)
            examples.append({'description': desc, 'severity': 'Immediate'})
    
    return examples

def create_high_examples():
    """Generate High severity examples (serious crimes that occurred)"""
    examples = []
    
    high_keywords_en = ['murder', 'assault', 'attack', 'robbery', 'drug trafficking', 
                       'drug dealing', 'shooting', 'gang violence', 'fraud', 'kidnap',
                       'human trafficking', 'smuggling', 'rape', 'sexual assault',
                       'extortion', 'corruption', 'bribery', 'drug lord', 'drug cartel']
    
    high_keywords_fil = ['pagpatay', 'holdap', 'holdapin', 'droga', 'pamamaril',
                        'karahasan', 'korupsyon', 'kidnapin', 'smugglin', 'rapein',
                        'kotong', 'kotongan', 'lagay', 'lagayan', 'pusher']
    
    templates_en = [
        "{keyword} occurred at {loc}. Suspect fled the scene.",
        "Serious {keyword} reported at {loc}. Victim hospitalized, investigation ongoing.",
        "Past {keyword} at {loc}. Suspects at large, investigation needed.",
        "{keyword} incident at {loc}. Large quantity involved, investigation required.",
        "Major {keyword} case at {loc}. Multiple victims affected.",
        "{keyword} discovered at {loc}. Evidence collected, suspect identified.",
        "Serious {keyword} operation at {loc}. Significant damage occurred.",
        "{keyword} case at {loc}. Victim rescued, suspects arrested.",
        "Organized {keyword} at {loc}. Major investigation underway.",
        "{keyword} that occurred at {loc}. Suspects fled before police arrival.",
    ]
    
    templates_fil = [
        "May naganap na {keyword} sa {loc}. Nakatakas ang suspetsado.",
        "May naiulat na seryosong {keyword} sa {loc}. Na-hospitalize ang biktima, patuloy ang imbestigasyon.",
        "May nakaraang {keyword} sa {loc}. Nakatakas ang mga suspetsado, kailangan ng imbestigasyon.",
        "May insidente ng {keyword} sa {loc}. Malaking dami ang kasama, kailangan ng imbestigasyon.",
        "May malaking kaso ng {keyword} sa {loc}. Maraming biktima ang apektado.",
        "May natuklasang {keyword} sa {loc}. Nakolekta ang ebidensya, natukoy ang suspetsado.",
        "May seryosong {keyword} na operasyon sa {loc}. Malaking pinsala ang naganap.",
        "May kaso ng {keyword} sa {loc}. Nailigtas ang biktima, naaresto ang mga suspetsado.",
        "May organisadong {keyword} sa {loc}. Malaking imbestigasyon ang isinasagawa.",
        "May {keyword} na naganap sa {loc}. Nakatakas ang mga suspetsado bago dumating ang pulis.",
    ]
    
    for i in range(500):  # 500 High examples
        if i < 250:
            template = random.choice(templates_en)
            keyword = random.choice(high_keywords_en)
            loc = random.choice(LOCATIONS)
            desc = template.format(keyword=keyword, loc=loc)
            examples.append({'description': desc, 'severity': 'High'})
        else:
            template = random.choice(templates_fil)
            keyword = random.choice(high_keywords_fil)
            loc = random.choice(LOCATIONS_FILIPINO)
            desc = template.format(keyword=keyword, loc=loc)
            examples.append({'description': desc, 'severity': 'High'})
    
    return examples

def create_moderate_examples():
    """Generate Moderate severity examples (less severe offenses)"""
    examples = []
    
    moderate_keywords_en = ['theft', 'vandalism', 'breaking and entering', 'disturbance',
                           'noise', 'harassment', 'disorderly', 'fight', 'trespassing',
                           'parking violation', 'loitering', 'petty theft', 'shoplifting']
    
    moderate_keywords_fil = ['nakaw', 'nakawin', 'gulo', 'guluhin', 'ingay', 'pananakot',
                            'takutan', 'away', 'awayin', 'magnanakaw']
    
    templates_en = [
        "{keyword} at {loc}. Suspect fled, no victims present.",
        "{keyword} incident at {loc}. Situation resolved peacefully.",
        "{keyword} reported at {loc}. Minor damage occurred.",
        "{keyword} complaint at {loc}. No immediate danger.",
        "{keyword} disturbance at {loc}. Suspect left the area.",
        "{keyword} at {loc}. Small value items involved.",
        "{keyword} situation at {loc}. Property maintenance needed.",
        "{keyword} at {loc}. Verbal incident, no physical harm.",
        "{keyword} issue at {loc}. Routine matter, no urgency.",
        "{keyword} at {loc}. Non-violent incident occurred.",
    ]
    
    templates_fil = [
        "May {keyword} sa {loc}. Nakatakas ang suspetsado, walang biktima.",
        "May insidente ng {keyword} sa {loc}. Na-resolve nang mapayapa ang sitwasyon.",
        "May naiulat na {keyword} sa {loc}. Maliit na pinsala ang naganap.",
        "May reklamo ng {keyword} sa {loc}. Walang agarang panganib.",
        "May {keyword} na kaguluhan sa {loc}. Umalis ang suspetsado sa lugar.",
        "May {keyword} sa {loc}. Maliit na halaga ng gamit ang kasama.",
        "May sitwasyon ng {keyword} sa {loc}. Kailangan ng pag-aayos ng ari-arian.",
        "May {keyword} sa {loc}. Verbal na insidente, walang pisikal na pinsala.",
        "May isyu ng {keyword} sa {loc}. Karaniwang bagay, walang kagyatan.",
        "May {keyword} sa {loc}. Non-violent na insidente ang naganap.",
    ]
    
    for i in range(500):  # 500 Moderate examples
        if i < 250:
            template = random.choice(templates_en)
            keyword = random.choice(moderate_keywords_en)
            loc = random.choice(LOCATIONS)
            desc = template.format(keyword=keyword, loc=loc)
            examples.append({'description': desc, 'severity': 'Moderate'})
        else:
            template = random.choice(templates_fil)
            keyword = random.choice(moderate_keywords_fil)
            loc = random.choice(LOCATIONS_FILIPINO)
            desc = template.format(keyword=keyword, loc=loc)
            examples.append({'description': desc, 'severity': 'Moderate'})
    
    return examples

def create_low_examples():
    """Generate Low severity examples (minor incidents, non-emergency)"""
    examples = []
    
    low_keywords_en = ['noise', 'parking', 'lost property', 'found property',
                      'inquiry', 'question', 'minor violation', 'complaint',
                      'maintenance', 'routine', 'property', 'general']
    
    low_keywords_fil = ['ingay', 'tanong', 'reklamo', 'pag-aayos', 'karaniwan',
                       'nawawalang gamit', 'natagpuang gamit', 'maliit na paglabag']
    
    templates_en = [
        "{keyword} complaint at {loc}. Routine matter, no urgency.",
        "Lost property report at {loc}. Item turned in for safekeeping.",
        "{keyword} issue at {loc}. General inquiry, non-emergency.",
        "Minor {keyword} at {loc}. Routine maintenance needed.",
        "{keyword} at {loc}. Non-violent incident, low priority.",
        "Found property at {loc}. Item recovered, no suspect.",
        "{keyword} inquiry at {loc}. Information request, not urgent.",
        "{keyword} at {loc}. Minor violation, no threat.",
        "General {keyword} at {loc}. No immediate action needed.",
        "{keyword} report at {loc}. For insurance purposes only.",
        "Noise complaint at {loc}. Loud music from neighbor.",
        "Parking violation at {loc}. Vehicle parked incorrectly.",
        "Routine check at {loc}. Administrative service needed.",
    ]
    
    templates_fil = [
        "May reklamo ng {keyword} sa {loc}. Karaniwang bagay, walang kagyatan.",
        "May naiulat na nawawalang gamit sa {loc}. Ibinigay ang gamit para sa pag-iingat.",
        "May isyu ng {keyword} sa {loc}. Pangkalahatang tanong, hindi emergency.",
        "May maliit na {keyword} sa {loc}. Kailangan ng karaniwang pag-aayos.",
        "May {keyword} sa {loc}. Non-violent na insidente, mababang priyoridad.",
        "May natagpuang gamit sa {loc}. Nakuha ang gamit, walang suspetsado.",
        "May tanong tungkol sa {keyword} sa {loc}. Hiling ng impormasyon, hindi kagyatan.",
        "May {keyword} sa {loc}. Maliit na paglabag, walang banta.",
        "May pangkalahatang {keyword} sa {loc}. Walang kagyat na aksyon na kailangan.",
        "May ulat ng {keyword} sa {loc}. Para lamang sa insurance.",
        "May reklamo ng ingay sa {loc}. Maingay na musika mula sa kapitbahay.",
        "May paglabag sa parking sa {loc}. Mali ang pag-park ng sasakyan.",
        "May routine check sa {loc}. Kailangan ng administrative service.",
    ]
    
    for i in range(500):  # 500 Low examples
        if i < 250:
            template = random.choice(templates_en)
            keyword = random.choice(low_keywords_en)
            loc = random.choice(LOCATIONS)
            desc = template.format(keyword=keyword, loc=loc)
            examples.append({'description': desc, 'severity': 'Low'})
        else:
            template = random.choice(templates_fil)
            keyword = random.choice(low_keywords_fil)
            loc = random.choice(LOCATIONS_FILIPINO)
            desc = template.format(keyword=keyword, loc=loc)
            examples.append({'description': desc, 'severity': 'Low'})
    
    return examples

def create_dataset():
    """Create comprehensive 2000-example dataset"""
    print("Generating 2000 training examples...")
    print("Using keywords from threatDetection.js")
    
    all_examples = []
    
    # Generate examples for each severity
    print("Creating Immediate examples (500)...")
    all_examples.extend(create_immediate_examples())
    
    print("Creating High examples (500)...")
    all_examples.extend(create_high_examples())
    
    print("Creating Moderate examples (500)...")
    all_examples.extend(create_moderate_examples())
    
    print("Creating Low examples (500)...")
    all_examples.extend(create_low_examples())
    
    # Shuffle to mix severities
    random.shuffle(all_examples)
    
    # Create DataFrame
    df = pd.DataFrame(all_examples)
    
    # Display statistics
    print(f"\n✅ Generated {len(df)} examples")
    print("\nSeverity distribution:")
    print(df['severity'].value_counts())
    
    # Save to CSV
    output_file = 'training_data.csv'
    df.to_csv(output_file, index=False)
    print(f"\n✅ Saved to {output_file}")
    
    return df

if __name__ == '__main__':
    random.seed(42)  # For reproducibility
    create_dataset()

