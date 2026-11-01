import type { Schema, Struct } from '@strapi/strapi';

export interface CollegeCampusTour extends Struct.ComponentSchema {
  collectionName: 'components_common_campus_tours';
  info: {
    description: '';
    displayName: 'Campus Tour';
  };
  attributes: {
    googlemap: Schema.Attribute.Component<'common.gmapcard', false>;
    video: Schema.Attribute.Component<'common.videocard', false>;
  };
}

export interface CollegeFaqSection extends Struct.ComponentSchema {
  collectionName: 'components_college_faq_sections';
  info: {
    description: '';
    displayName: 'Faq Section';
  };
  attributes: {
    faqs: Schema.Attribute.Component<'common.faqs', true>;
  };
}

export interface CollegeFeatured extends Struct.ComponentSchema {
  collectionName: 'components_college_featureds';
  info: {
    description: '';
    displayName: 'Featured';
  };
  attributes: {
    cards: Schema.Attribute.Component<'common.card', true>;
    description: Schema.Attribute.Blocks;
    name: Schema.Attribute.String;
  };
}

export interface CollegeFeeStructure extends Struct.ComponentSchema {
  collectionName: 'components_college_fee_structures';
  info: {
    description: '';
    displayName: 'Fee Structure';
  };
  attributes: {
    description: Schema.Attribute.Blocks;
    name: Schema.Attribute.String;
    show_program_table: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
  };
}

export interface CollegeImages extends Struct.ComponentSchema {
  collectionName: 'components_college_images';
  info: {
    displayName: 'Images';
  };
  attributes: {
    images: Schema.Attribute.Component<'common.gallery', true>;
  };
}

export interface CollegeProgramFee extends Struct.ComponentSchema {
  collectionName: 'components_college_program_fees';
  info: {
    description: 'What this university charges for one program. Fee belongs to the university-and-program pair, so it is edited on the university, in one form, rather than as a separate record per pair.';
    displayName: 'Program Fee';
  };
  attributes: {
    fee: Schema.Attribute.Decimal;
    note: Schema.Attribute.String;
    program: Schema.Attribute.Relation<'oneToOne', 'api::program.program'>;
  };
}

export interface CollegeStepsSection extends Struct.ComponentSchema {
  collectionName: 'components_college_steps_sections';
  info: {
    description: 'An ordered procedure such as the admission process, where order carries meaning.';
    displayName: 'Steps Section';
  };
  attributes: {
    name: Schema.Attribute.String;
    steps: Schema.Attribute.Component<'common.step', true>;
  };
}

export interface CommonBulletItem extends Struct.ComponentSchema {
  collectionName: 'components_common_bullet_items';
  info: {
    description: 'One entry of a flat list, addressable on its own.';
    displayName: 'Bullet Item';
  };
  attributes: {
    icon: Schema.Attribute.String;
    text: Schema.Attribute.String;
  };
}

export interface CommonBulletList extends Struct.ComponentSchema {
  collectionName: 'components_common_bullet_lists';
  info: {
    description: 'A titled flat list. Prose bullets lose per-item identity; these keep it.';
    displayName: 'Bullet List';
  };
  attributes: {
    items: Schema.Attribute.Component<'common.bullet-item', true>;
    name: Schema.Attribute.String;
  };
}

export interface CommonButton extends Struct.ComponentSchema {
  collectionName: 'components_common_buttons';
  info: {
    description: '';
    displayName: 'Button';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images'>;
    link: Schema.Attribute.String;
    name: Schema.Attribute.String;
    referral_type: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'noopener'>;
    target: Schema.Attribute.Enumeration<['self', '_blank']>;
    type: Schema.Attribute.Enumeration<['link', 'email', 'mobile', 'external']>;
  };
}

export interface CommonCard extends Struct.ComponentSchema {
  collectionName: 'components_common_cards';
  info: {
    description: '';
    displayName: 'Card';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    label: Schema.Attribute.String;
    link: Schema.Attribute.String;
    mob_image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
    video_link: Schema.Attribute.String;
  };
}

export interface CommonCitycard extends Struct.ComponentSchema {
  collectionName: 'components_common_citycards';
  info: {
    description: '';
    displayName: 'Citycard';
  };
  attributes: {
    city: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    label: Schema.Attribute.String;
    link: Schema.Attribute.String;
    name: Schema.Attribute.String;
  };
}

export interface CommonCitywise extends Struct.ComponentSchema {
  collectionName: 'components_common_citywises';
  info: {
    displayName: 'Citywise';
  };
  attributes: {
    cities: Schema.Attribute.Component<'common.citycard', true>;
    heading: Schema.Attribute.String;
  };
}

export interface CommonContactCard extends Struct.ComponentSchema {
  collectionName: 'components_common_contact_cards';
  info: {
    displayName: 'Contact Card';
  };
  attributes: {
    button: Schema.Attribute.Component<'common.button', true>;
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.String;
    name: Schema.Attribute.String;
  };
}

export interface CommonCustomSection extends Struct.ComponentSchema {
  collectionName: 'components_common_custom_sections';
  info: {
    description: 'Responsive text and image section with an optional button';
    displayName: 'Custom Content Section';
  };
  attributes: {
    background: Schema.Attribute.Enumeration<['ivory', 'white', 'ruby_tint']> &
      Schema.Attribute.DefaultTo<'ivory'>;
    body: Schema.Attribute.Blocks;
    button_label: Schema.Attribute.String;
    button_link: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'>;
    image_alt: Schema.Attribute.String;
    layout: Schema.Attribute.Enumeration<
      ['image_right', 'image_left', 'text_only']
    > &
      Schema.Attribute.DefaultTo<'image_right'>;
  };
}

export interface CommonFaqs extends Struct.ComponentSchema {
  collectionName: 'components_common_faqs';
  info: {
    description: '';
    displayName: 'Faqs';
  };
  attributes: {
    description: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
  };
}

export interface CommonGallery extends Struct.ComponentSchema {
  collectionName: 'components_common_galleries';
  info: {
    displayName: 'Gallery';
  };
  attributes: {
    desktop_image: Schema.Attribute.Media<'images'>;
    mobile_image: Schema.Attribute.Media<'images'>;
  };
}

export interface CommonGmapcard extends Struct.ComponentSchema {
  collectionName: 'components_common_gmapcards';
  info: {
    description: '';
    displayName: 'Gmapcard';
  };
  attributes: {
    description: Schema.Attribute.Text;
    link: Schema.Attribute.Text;
    name: Schema.Attribute.String;
  };
}

export interface CommonHighlightList extends Struct.ComponentSchema {
  collectionName: 'components_common_highlight_lists';
  info: {
    description: 'A titled group of key/value tiles, scoped to one section rather than the whole entity.';
    displayName: 'Highlight List';
  };
  attributes: {
    items: Schema.Attribute.Component<'home.highlights', true>;
    name: Schema.Attribute.String;
  };
}

export interface CommonHtmlSection extends Struct.ComponentSchema {
  collectionName: 'components_common_html_sections';
  info: {
    description: 'Custom HTML and CSS with an isolated live preview in the editor';
    displayName: 'HTML/CSS Section';
  };
  attributes: {
    code: Schema.Attribute.JSON &
      Schema.Attribute.CustomField<'global::html-css-preview'>;
    name: Schema.Attribute.String;
  };
}

export interface CommonNotification extends Struct.ComponentSchema {
  collectionName: 'components_common_notifications';
  info: {
    displayName: 'Notification';
  };
  attributes: {
    description: Schema.Attribute.Blocks;
    heading: Schema.Attribute.String;
  };
}

export interface CommonRichText extends Struct.ComponentSchema {
  collectionName: 'components_common_rich_texts';
  info: {
    displayName: 'Rich Text';
  };
  attributes: {
    body: Schema.Attribute.Blocks;
    heading: Schema.Attribute.String;
  };
}

export interface CommonStep extends Struct.ComponentSchema {
  collectionName: 'components_common_steps';
  info: {
    description: 'One step of an ordered procedure.';
    displayName: 'Step';
  };
  attributes: {
    description: Schema.Attribute.Text;
    position: Schema.Attribute.Integer;
    title: Schema.Attribute.String;
  };
}

export interface CommonTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_common_testimonials';
  info: {
    description: '';
    displayName: 'Testimonial';
  };
  attributes: {
    designation: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    message: Schema.Attribute.Text;
    name: Schema.Attribute.String;
    rating: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<4>;
  };
}

export interface CommonTitleDescription extends Struct.ComponentSchema {
  collectionName: 'components_common_title_descriptions';
  info: {
    description: '';
    displayName: 'Title Description';
  };
  attributes: {
    description: Schema.Attribute.Text;
    name: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      [
        'News',
        'Similar Colleges',
        'Similar Programs',
        'Categories',
        'stream',
        'university',
        'press-release',
        'blogs',
      ]
    >;
  };
}

export interface CommonVideocard extends Struct.ComponentSchema {
  collectionName: 'components_common_videocards';
  info: {
    displayName: 'Videocard';
  };
  attributes: {
    description: Schema.Attribute.Text;
    desktop_image: Schema.Attribute.Media<'images'>;
    embedded_video_link: Schema.Attribute.String;
    mobile_image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
  };
}

export interface ContactRpContact extends Struct.ComponentSchema {
  collectionName: 'components_contact_rp_contacts';
  info: {
    displayName: 'Rp Contact';
  };
  attributes: {
    cards: Schema.Attribute.Component<'common.contact-card', true>;
  };
}

export interface ContactSocialSection extends Struct.ComponentSchema {
  collectionName: 'components_contact_social_sections';
  info: {
    displayName: 'Social Section';
  };
  attributes: {
    button: Schema.Attribute.Component<'common.button', false>;
    helper_text: Schema.Attribute.String;
    sociallinks: Schema.Attribute.Component<'contact.sociallinks', false>;
  };
}

export interface ContactSociallinks extends Struct.ComponentSchema {
  collectionName: 'components_contact_sociallinks';
  info: {
    displayName: 'Sociallinks';
  };
  attributes: {
    name: Schema.Attribute.String;
    socials: Schema.Attribute.Relation<'oneToMany', 'api::social.social'>;
  };
}

export interface HomeAboutCard extends Struct.ComponentSchema {
  collectionName: 'components_home_about_cards';
  info: {
    description: '';
    displayName: 'About Card';
  };
  attributes: {
    description: Schema.Attribute.Blocks;
    image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
    sec_card_desc: Schema.Attribute.Text;
    sec_card_designation: Schema.Attribute.String;
    sec_card_name: Schema.Attribute.String;
    short_description: Schema.Attribute.Text;
  };
}

export interface HomeBanner extends Struct.ComponentSchema {
  collectionName: 'components_home_banners';
  info: {
    description: '';
    displayName: 'Banner';
  };
  attributes: {
    cards: Schema.Attribute.Component<'common.card', true>;
    heading: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface HomeComparisonRow extends Struct.ComponentSchema {
  collectionName: 'components_home_comparison_rows';
  info: {
    description: 'A factor in the education guidance comparison';
    displayName: 'Comparison Row';
  };
  attributes: {
    competitor_value: Schema.Attribute.String & Schema.Attribute.Required;
    factor: Schema.Attribute.String & Schema.Attribute.Required;
    gedu_value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeCourseFinderConfig extends Struct.ComponentSchema {
  collectionName: 'components_home_course_finder_configs';
  info: {
    description: '';
    displayName: 'Course Finder Config';
    icon: 'search';
  };
  attributes: {
    budget_caps: Schema.Attribute.JSON;
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Dynamic Program Discovery'>;
    feature_badges: Schema.Attribute.JSON;
    heading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Explore Online Programs by Goal & Stream'>;
    tabs: Schema.Attribute.Component<'home.intent-tab', true>;
  };
}

export interface HomeCtaBanner extends Struct.ComponentSchema {
  collectionName: 'components_home_cta_banners';
  info: {
    description: 'Bottom consultation advisor CTA banner';
    displayName: 'CTA Banner';
  };
  attributes: {
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    primary_cta_label: Schema.Attribute.String;
    primary_cta_link: Schema.Attribute.String;
    secondary_cta_label: Schema.Attribute.String;
    secondary_cta_link: Schema.Attribute.String;
  };
}

export interface HomeFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_home_faq_items';
  info: {
    description: 'Homepage frequently asked question and answer';
    displayName: 'FAQ Item';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeHeroSlide extends Struct.ComponentSchema {
  collectionName: 'components_home_hero_slides';
  info: {
    description: 'One slide of the homepage hero carousel: an image, an uploaded video or a YouTube embed, with an optional link on the whole slide.';
    displayName: 'Hero Slide';
  };
  attributes: {
    cta_label: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    desktop_image: Schema.Attribute.Media<'images'>;
    embedded_video_link: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    link: Schema.Attribute.String;
    link_target: Schema.Attribute.Enumeration<['self', '_blank']> &
      Schema.Attribute.DefaultTo<'self'>;
    media_type: Schema.Attribute.Enumeration<['image', 'video', 'youtube']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'image'>;
    mobile_image: Schema.Attribute.Media<'images'>;
    mobile_video_file: Schema.Attribute.Media<'videos'>;
    offering_program: Schema.Attribute.Relation<
      'manyToOne',
      'api::program.program'
    >;
    offering_university: Schema.Attribute.Relation<
      'manyToOne',
      'api::university.university'
    >;
    video_file: Schema.Attribute.Media<'videos'>;
  };
}

export interface HomeHighlights extends Struct.ComponentSchema {
  collectionName: 'components_home_highlights';
  info: {
    description: '';
    displayName: 'Highlights';
  };
  attributes: {
    icon: Schema.Attribute.String;
    key: Schema.Attribute.String;
    value: Schema.Attribute.String;
  };
}

export interface HomeHowItWorksSection extends Struct.ComponentSchema {
  collectionName: 'components_home_how_it_works_sections';
  info: {
    description: '';
    displayName: 'How It Works Section';
    icon: 'list-ol';
  };
  attributes: {
    cta_label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Start Common Application'>;
    cta_link: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/common-application-form'>;
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Streamlined Admission Journey'>;
    heading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'How Agrico Works'>;
    steps: Schema.Attribute.Component<'home.step-card', true>;
  };
}

export interface HomeIntentTab extends Struct.ComponentSchema {
  collectionName: 'components_home_intent_tabs';
  info: {
    description: '';
    displayName: 'Intent Tab';
    icon: 'filter';
  };
  attributes: {
    filter_criteria: Schema.Attribute.Enumeration<
      [
        'postgraduate',
        'undergraduate',
        'tech-ai',
        'working-professional',
        'managers-leaders',
        'doctorate',
        'all',
      ]
    > &
      Schema.Attribute.DefaultTo<'all'>;
    key: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    note: Schema.Attribute.String;
  };
}

export interface HomeKeyStatsSection extends Struct.ComponentSchema {
  collectionName: 'components_home_key_stats_sections';
  info: {
    displayName: 'Key Stats Section';
  };
  attributes: {
    card: Schema.Attribute.Component<'common.card', false>;
    stats: Schema.Attribute.Component<'home.highlights', true>;
  };
}

export interface HomeMentorSelection extends Struct.ComponentSchema {
  collectionName: 'components_home_mentor_selections';
  info: {
    description: 'One published item in the chosen display order.';
    displayName: 'Selected mentor';
  };
  attributes: {
    mentor: Schema.Attribute.Relation<
      'manyToOne',
      'api::mentor-profile.mentor-profile'
    >;
  };
}

export interface HomeOfferingSelection extends Struct.ComponentSchema {
  collectionName: 'components_home_offering_selections';
  info: {
    description: 'Select one actual programme and its university. Repeatable items retain the editorial display order.';
    displayName: 'Programme and University';
  };
  attributes: {
    program: Schema.Attribute.Relation<'manyToOne', 'api::program.program'>;
    university: Schema.Attribute.Relation<
      'manyToOne',
      'api::university.university'
    >;
  };
}

export interface HomePostSelection extends Struct.ComponentSchema {
  collectionName: 'components_home_post_selections';
  info: {
    description: 'One published item in the chosen display order.';
    displayName: 'Selected post';
  };
  attributes: {
    post: Schema.Attribute.Relation<'manyToOne', 'api::blog.blog'>;
  };
}

export interface HomeSectionHeader extends Struct.ComponentSchema {
  collectionName: 'components_home_section_headers';
  info: {
    description: 'Configurable section header, subtitle, badges and cta';
    displayName: 'Section Header';
    icon: 'heading';
  };
  attributes: {
    badges: Schema.Attribute.JSON;
    cta_label: Schema.Attribute.String;
    cta_link: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    heading: Schema.Attribute.String;
  };
}

export interface HomeServiceLink extends Struct.ComponentSchema {
  collectionName: 'components_home_service_links';
  info: {
    description: 'A concise service or discovery link.';
    displayName: 'Service Link';
  };
  attributes: {
    description: Schema.Attribute.Text;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    icon_name: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeSpotlightOffering extends Struct.ComponentSchema {
  collectionName: 'components_home_spotlight_offerings';
  info: {
    description: 'Feature one university programme using its canonical catalogue details. An editorial image must not imply an unverified campus or affiliation.';
    displayName: 'Programme Spotlight';
  };
  attributes: {
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    program: Schema.Attribute.Relation<'manyToOne', 'api::program.program'>;
    university: Schema.Attribute.Relation<
      'manyToOne',
      'api::university.university'
    >;
  };
}

export interface HomeStatItem extends Struct.ComponentSchema {
  collectionName: 'components_home_stat_items';
  info: {
    description: 'Key metric counter and label';
    displayName: 'Stat Item';
  };
  attributes: {
    accent_color: Schema.Attribute.Enumeration<
      ['gold', 'emerald', 'brand', 'purple']
    > &
      Schema.Attribute.DefaultTo<'brand'>;
    description: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeStepCard extends Struct.ComponentSchema {
  collectionName: 'components_home_step_cards';
  info: {
    description: '3-Step admission process card';
    displayName: 'Step Card';
  };
  attributes: {
    badge: Schema.Attribute.String;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    highlights: Schema.Attribute.JSON;
    icon_name: Schema.Attribute.String;
    step_number: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeTestimonialSection extends Struct.ComponentSchema {
  collectionName: 'components_home_testimonial_sections';
  info: {
    displayName: 'Testimonial Section';
  };
  attributes: {
    description: Schema.Attribute.Text;
    name: Schema.Attribute.String;
    testimonials: Schema.Attribute.Component<'common.testimonial', true>;
  };
}

export interface HomeTestimonialSelection extends Struct.ComponentSchema {
  collectionName: 'components_home_testimonial_selections';
  info: {
    description: 'One published item in the chosen display order.';
    displayName: 'Selected testimonial';
  };
  attributes: {
    testimonial: Schema.Attribute.Relation<
      'manyToOne',
      'api::testimonial.testimonial'
    >;
  };
}

export interface HomeTrendingItem extends Struct.ComponentSchema {
  collectionName: 'components_home_trending_items';
  info: {
    description: 'Quick link chip for trending courses';
    displayName: 'Trending Item';
  };
  attributes: {
    is_featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    link: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeUniversitySelection extends Struct.ComponentSchema {
  collectionName: 'components_home_university_selections';
  info: {
    description: 'One university in the chosen display order.';
    displayName: 'Selected University';
  };
  attributes: {
    university: Schema.Attribute.Relation<
      'manyToOne',
      'api::university.university'
    >;
  };
}

export interface HomeWhyGeduCard extends Struct.ComponentSchema {
  collectionName: 'components_home_why_gedu_cards';
  info: {
    description: 'Feature advantage card with checklist points';
    displayName: 'Why Gedu Card';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    icon_name: Schema.Attribute.String;
    points: Schema.Attribute.JSON;
    tag: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeWhyGeduSection extends Struct.ComponentSchema {
  collectionName: 'components_home_why_gedu_sections';
  info: {
    description: '';
    displayName: 'Why Agrico Section';
    icon: 'shield';
  };
  attributes: {
    cards: Schema.Attribute.Component<'home.why-gedu-card', true>;
    comparison_badge: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Admission guidance'>;
    comparison_heading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'How Agrico helps you choose'>;
    comparison_matrix: Schema.Attribute.Component<'home.comparison-row', true>;
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'The Agrico Advantage'>;
    heading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Explore your options with Agrico'>;
    micro_badges: Schema.Attribute.JSON;
    primary_cta_label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Compare universities'>;
    primary_cta_link: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/compare'>;
    secondary_cta_label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'How We Verify Universities'>;
    secondary_cta_link: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/about-us'>;
  };
}

export interface HomeWhychooseus extends Struct.ComponentSchema {
  collectionName: 'components_home_whychooseuses';
  info: {
    displayName: 'Whychooseus';
  };
  attributes: {
    cards: Schema.Attribute.Component<'common.card', true>;
    description: Schema.Attribute.Text;
    desktop_image: Schema.Attribute.Media<'images'>;
    embedded_video_link: Schema.Attribute.String;
    mobile_image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
  };
}

export interface MentorAvailabilitySlot extends Struct.ComponentSchema {
  collectionName: 'components_mentor_availability_slots';
  info: {
    description: 'One recurring weekly window a mentor is bookable in.';
    displayName: 'Availability Slot';
  };
  attributes: {
    day_of_week: Schema.Attribute.Enumeration<
      [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
    > &
      Schema.Attribute.Required;
    end_time: Schema.Attribute.Time & Schema.Attribute.Required;
    start_time: Schema.Attribute.Time & Schema.Attribute.Required;
  };
}

export interface SharedMetaSocial extends Struct.ComponentSchema {
  collectionName: 'components_shared_meta_socials';
  info: {
    description: '';
    displayName: 'Meta Social';
    icon: 'project-diagram';
  };
  attributes: {
    description: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    image: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    socialNetwork: Schema.Attribute.Enumeration<['Facebook', 'Twitter']> &
      Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'search';
  };
  attributes: {
    canonicalURL: Schema.Attribute.String;
    keywords: Schema.Attribute.Text;
    metaDescription: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    metaImage: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    metaRobots: Schema.Attribute.String;
    metaSocial: Schema.Attribute.Component<'shared.meta-social', true>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    metaViewport: Schema.Attribute.String;
    structuredData: Schema.Attribute.JSON;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'college.campus-tour': CollegeCampusTour;
      'college.faq-section': CollegeFaqSection;
      'college.featured': CollegeFeatured;
      'college.fee-structure': CollegeFeeStructure;
      'college.images': CollegeImages;
      'college.program-fee': CollegeProgramFee;
      'college.steps-section': CollegeStepsSection;
      'common.bullet-item': CommonBulletItem;
      'common.bullet-list': CommonBulletList;
      'common.button': CommonButton;
      'common.card': CommonCard;
      'common.citycard': CommonCitycard;
      'common.citywise': CommonCitywise;
      'common.contact-card': CommonContactCard;
      'common.custom-section': CommonCustomSection;
      'common.faqs': CommonFaqs;
      'common.gallery': CommonGallery;
      'common.gmapcard': CommonGmapcard;
      'common.highlight-list': CommonHighlightList;
      'common.html-section': CommonHtmlSection;
      'common.notification': CommonNotification;
      'common.rich-text': CommonRichText;
      'common.step': CommonStep;
      'common.testimonial': CommonTestimonial;
      'common.title-description': CommonTitleDescription;
      'common.videocard': CommonVideocard;
      'contact.rp-contact': ContactRpContact;
      'contact.social-section': ContactSocialSection;
      'contact.sociallinks': ContactSociallinks;
      'home.about-card': HomeAboutCard;
      'home.banner': HomeBanner;
      'home.comparison-row': HomeComparisonRow;
      'home.course-finder-config': HomeCourseFinderConfig;
      'home.cta-banner': HomeCtaBanner;
      'home.faq-item': HomeFaqItem;
      'home.hero-slide': HomeHeroSlide;
      'home.highlights': HomeHighlights;
      'home.how-it-works-section': HomeHowItWorksSection;
      'home.intent-tab': HomeIntentTab;
      'home.key-stats-section': HomeKeyStatsSection;
      'home.mentor-selection': HomeMentorSelection;
      'home.offering-selection': HomeOfferingSelection;
      'home.post-selection': HomePostSelection;
      'home.section-header': HomeSectionHeader;
      'home.service-link': HomeServiceLink;
      'home.spotlight-offering': HomeSpotlightOffering;
      'home.stat-item': HomeStatItem;
      'home.step-card': HomeStepCard;
      'home.testimonial-section': HomeTestimonialSection;
      'home.testimonial-selection': HomeTestimonialSelection;
      'home.trending-item': HomeTrendingItem;
      'home.university-selection': HomeUniversitySelection;
      'home.why-gedu-card': HomeWhyGeduCard;
      'home.why-gedu-section': HomeWhyGeduSection;
      'home.whychooseus': HomeWhychooseus;
      'mentor.availability-slot': MentorAvailabilitySlot;
      'shared.meta-social': SharedMetaSocial;
      'shared.seo': SharedSeo;
    }
  }
}
