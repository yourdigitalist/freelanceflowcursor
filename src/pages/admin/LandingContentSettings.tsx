import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLandingContent, useLandingContentMutation } from '@/hooks/useLandingContent';
import type { LandingContent } from '@/lib/landingContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Upload, Search } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listAllIconPaths, getAppIconPublicUrl, displayNameForIconPath } from '@/lib/appIcons';

const LANDING_BUCKET = 'landing-images';
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

function useLandingForm(initial: LandingContent | null) {
  const [form, setForm] = useState<LandingContent | null>(initial);
  useEffect(() => {
    setForm(initial);
  }, [initial]);
  const update = <K extends keyof LandingContent>(section: K, updates: Partial<LandingContent[K]>) => {
    if (!form) return;
    setForm({
      ...form,
      [section]: { ...form[section], ...updates },
    });
  };
  return { form, setForm, update };
}

export default function LandingContentSettings() {
  const { data: content, isPending } = useLandingContent();
  const { invalidate } = useLandingContentMutation();
  const { toast } = useToast();
  const { form, setForm, update } = useLandingForm(content ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const heroImageRef = useRef<HTMLInputElement>(null);
  const solutionImageRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { data: appIconPaths = [], isLoading: loadingIconPaths } = useQuery({
    queryKey: ['app_icons_bucket_list'],
    queryFn: listAllIconPaths,
    staleTime: 5 * 60 * 1000,
  });

  const [problemIconPickerBox, setProblemIconPickerBox] = useState<number | null>(null);
  const [problemIconSearch, setProblemIconSearch] = useState('');
  const filteredProblemIconPaths = useMemo(() => {
    if (!problemIconSearch.trim()) return appIconPaths;
    const q = problemIconSearch.toLowerCase().trim();
    return appIconPaths.filter(
      (path) =>
        displayNameForIconPath(path).toLowerCase().includes(q) || path.toLowerCase().includes(q)
    );
  }, [appIconPaths, problemIconSearch]);

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage.from(LANDING_BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(LANDING_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleHeroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'File too large (max 2 MB)', variant: 'destructive' });
      return;
    }
    setUploading('hero');
    try {
      const url = await uploadImage(file, `hero-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`);
      update('hero', { imageUrl: url });
      toast({ title: 'Hero image uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleSolutionBoxImage = async (boxIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form?.solution?.boxes) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'File too large (max 2 MB)', variant: 'destructive' });
      return;
    }
    setUploading(`solution-${boxIndex}`);
    try {
      const url = await uploadImage(file, `solution-${boxIndex}-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`);
      const boxes = [...form.solution.boxes];
      boxes[boxIndex] = { ...boxes[boxIndex], imageUrl: url };
      update('solution', { boxes });
      toast({ title: 'Image uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('landing_content')
        .update({ content: form as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
      await invalidate();
      toast({ title: 'Landing content saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isPending || !form) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landing page content</h1>
          <p className="text-muted-foreground">Edit all copy and images for the public landing page.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/" target="_blank" rel="noreferrer">
              View landing page
            </a>
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['header', 'hero']} className="w-full">
        <AccordionItem value="header">
          <AccordionTrigger>Header</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Login button text</Label>
              <Input value={form.header.ctaLogin} onChange={(e) => update('header', { ctaLogin: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Trial button text</Label>
              <Input value={form.header.ctaTrial} onChange={(e) => update('header', { ctaTrial: e.target.value })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hero">
          <AccordionTrigger>Hero</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Headline</Label>
              <Input value={form.hero.headline} onChange={(e) => update('hero', { headline: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtext</Label>
              <Input value={form.hero.subtext} onChange={(e) => update('hero', { subtext: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtext 2</Label>
              <Input value={form.hero.subtext2} onChange={(e) => update('hero', { subtext2: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Trial note</Label>
              <Input value={form.hero.trialNote} onChange={(e) => update('hero', { trialNote: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Primary CTA text</Label>
              <Input value={form.hero.ctaTrial} onChange={(e) => update('hero', { ctaTrial: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Secondary CTA (link)</Label>
              <Input value={form.hero.ctaSecondary} onChange={(e) => update('hero', { ctaSecondary: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Hero image</Label>
              <input ref={heroImageRef} type="file" accept="image/*" className="hidden" onChange={handleHeroImage} />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => heroImageRef.current?.click()} disabled={!!uploading}>
                  {uploading === 'hero' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload image
                </Button>
                {form.hero.imageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => update('hero', { imageUrl: '' })}
                  >
                    Remove image
                  </Button>
                ) : null}
                {form.hero.imageUrl ? (
                  <img src={form.hero.imageUrl} alt="" className="h-16 w-24 rounded object-cover border" />
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: wide image around 1200×700px (16:9 or similar). PNG or JPG.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="logos">
          <AccordionTrigger>Logos section</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Heading</Label>
              <Input value={form.logos.heading} onChange={(e) => update('logos', { heading: e.target.value })} />
            </div>
            <p className="text-sm text-muted-foreground">
              Logo image URLs: add one URL per line (e.g. from uploads or external). Logos are shown about 112×40px, transparent PNGs work best.
            </p>
            <Textarea
              value={form.logos.imageUrls.join('\n')}
              onChange={(e) => update('logos', { imageUrls: e.target.value.split('\n').filter(Boolean) })}
              rows={3}
              placeholder="https://..."
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="problem">
          <AccordionTrigger>Problem</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Section title (e.g. PROBLEM)</Label>
              <Input value={form.problem.title} onChange={(e) => update('problem', { title: e.target.value })} placeholder="Problem" />
            </div>
            <div className="grid gap-2">
              <Label>Main heading</Label>
              <Input value={form.problem.subtitle} onChange={(e) => update('problem', { subtitle: e.target.value })} placeholder="Freelance admin shouldn't be your full-time job." />
            </div>
            <p className="text-sm text-muted-foreground">Three problem boxes (icon, heading, description).</p>
            {(form.problem.boxes ?? []).map((box, i) => (
              <Card key={i}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Box {i + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid gap-2">
                    <Label>Icon (from Admin → Icons uploads)</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {box.icon ? (
                        <div className="h-14 w-14 flex items-center justify-center overflow-hidden rounded-md border bg-muted/80 shrink-0">
                          <img
                            src={getAppIconPublicUrl(box.icon)}
                            alt=""
                            className="h-10 w-10 object-contain"
                            style={{ filter: 'brightness(0) opacity(0.85)' }}
                          />
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProblemIconSearch('');
                          setProblemIconPickerBox(i);
                        }}
                      >
                        Choose icon
                      </Button>
                      {box.icon ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const boxes = [...(form.problem.boxes ?? [])];
                            boxes[i] = { ...boxes[i], icon: '' };
                            update('problem', { boxes });
                          }}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                    {appIconPaths.length === 0 && (
                      <p className="text-xs text-muted-foreground">Upload SVG icons in Admin → Icons first.</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Heading</Label>
                    <Input
                      value={box.heading}
                      onChange={(e) => {
                        const boxes = [...(form.problem.boxes ?? [])];
                        boxes[i] = { ...boxes[i], heading: e.target.value };
                        update('problem', { boxes });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={box.text}
                      onChange={(e) => {
                        const boxes = [...(form.problem.boxes ?? [])];
                        boxes[i] = { ...boxes[i], text: e.target.value };
                        update('problem', { boxes });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="solution">
          <AccordionTrigger>Solution</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Section title (e.g. SOLUTION)</Label>
              <Input value={form.solution.title} onChange={(e) => update('solution', { title: e.target.value })} placeholder="Solution" />
            </div>
            <div className="grid gap-2">
              <Label>Big header</Label>
              <Input value={form.solution.subtitle} onChange={(e) => update('solution', { subtitle: e.target.value })} placeholder="Lance takes care of the business in your business." />
            </div>
            <div className="grid gap-2">
              <Label>Subheader / description</Label>
              <Textarea value={form.solution.description} onChange={(e) => update('solution', { description: e.target.value })} rows={3} placeholder="One light, friendly workspace..." />
            </div>
            <p className="text-sm text-muted-foreground">
              Solution box images: recommended <strong>1200×600px (2:1)</strong> or <strong>800×512px</strong>. Displayed at max height 256px in the card.
            </p>
            {(form.solution.boxes ?? []).map((box, i) => (
              <Card key={i}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Box {i + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid gap-2">
                    <Label>Heading</Label>
                    <Input
                      value={box.heading}
                      onChange={(e) => {
                        const boxes = [...(form.solution.boxes ?? [])];
                        boxes[i] = { ...boxes[i], heading: e.target.value };
                        update('solution', { boxes });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Text</Label>
                    <Textarea
                      rows={3}
                      value={box.text}
                      onChange={(e) => {
                        const boxes = [...(form.solution.boxes ?? [])];
                        boxes[i] = { ...boxes[i], text: e.target.value };
                        update('solution', { boxes });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Image</Label>
                    <input
                      ref={(el) => { solutionImageRefs.current[i] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleSolutionBoxImage(i, e)}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => solutionImageRefs.current[i]?.click()}
                        disabled={uploading === `solution-${i}`}
                      >
                        {uploading === `solution-${i}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload image
                      </Button>
                      {box.imageUrl ? (
                        <>
                          <Button type="button" variant="ghost" size="sm" onClick={() => {
                            const boxes = [...(form.solution.boxes ?? [])];
                            boxes[i] = { ...boxes[i], imageUrl: '' };
                            update('solution', { boxes });
                          }}>
                            Remove
                          </Button>
                          <img src={box.imageUrl} alt="" className="h-16 w-24 rounded object-cover border" />
                        </>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="grid gap-2">
              <Label>CTA button under section</Label>
              <Input value={form.solution.ctaButtonText} onChange={(e) => update('solution', { ctaButtonText: e.target.value })} placeholder="Get started for free" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="howItWorks">
          <AccordionTrigger>How it works</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.howItWorks.title} onChange={(e) => update('howItWorks', { title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Input value={form.howItWorks.subtitle} onChange={(e) => update('howItWorks', { subtitle: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Footer line</Label>
              <Input value={form.howItWorks.footer} onChange={(e) => update('howItWorks', { footer: e.target.value })} />
            </div>
            <p className="text-sm text-muted-foreground">Steps are edited in code (step title + bullets). For now change title/subtitle/footer here.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="features">
          <AccordionTrigger>Features / Who it&apos;s for</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.features.title} onChange={(e) => update('features', { title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Input value={form.features.subtitle} onChange={(e) => update('features', { subtitle: e.target.value })} />
            </div>
            <p className="text-sm text-muted-foreground">
              Feature cards use a shared dashboard screenshot by default. You can optionally set individual image URLs here.
            </p>
            {form.features.items.map((item, i) => (
              <Card key={i}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Feature {i + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => {
                      const items = [...form.features.items];
                      items[i] = { ...items[i], title: e.target.value };
                      update('features', { items });
                    }}
                  />
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={item.content}
                    onChange={(e) => {
                      const items = [...form.features.items];
                      items[i] = { ...items[i], content: e.target.value };
                      update('features', { items });
                    }}
                  />
                  <Label>Image URL (optional)</Label>
                  <Input
                    placeholder="https://..."
                    value={item.imageUrl}
                    onChange={(e) => {
                      const items = [...form.features.items];
                      items[i] = { ...items[i], imageUrl: e.target.value };
                      update('features', { items });
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="testimonials">
          <AccordionTrigger>Testimonials</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Section title</Label>
              <Input value={form.testimonials.title} onChange={(e) => update('testimonials', { title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtitle</Label>
              <Input value={form.testimonials.subtitle} onChange={(e) => update('testimonials', { subtitle: e.target.value })} />
            </div>
            <p className="text-sm text-muted-foreground">
              Avatar images are displayed as small circles (~40×40px). Use square images where possible.
            </p>
            {form.testimonials.items.map((t, i) => (
              <Card key={i}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">Testimonial {i + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const items = form.testimonials.items.filter((_, idx) => idx !== i);
                        update('testimonials', { items });
                      }}
                      disabled={form.testimonials.items.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Label>Quote</Label>
                  <Input value={t.quote} onChange={(e) => {
                    const items = [...form.testimonials.items];
                    items[i] = { ...items[i], quote: e.target.value };
                    update('testimonials', { items });
                  }} />
                  <Label>Name</Label>
                  <Input value={t.name} onChange={(e) => {
                    const items = [...form.testimonials.items];
                    items[i] = { ...items[i], name: e.target.value };
                    update('testimonials', { items });
                  }} />
                  <Label>Role</Label>
                  <Input value={t.role} onChange={(e) => {
                    const items = [...form.testimonials.items];
                    items[i] = { ...items[i], role: e.target.value };
                    update('testimonials', { items });
                  }} />
                  <Label>Image URL (optional)</Label>
                  <Input value={t.imageUrl} onChange={(e) => {
                    const items = [...form.testimonials.items];
                    items[i] = { ...items[i], imageUrl: e.target.value };
                    update('testimonials', { items });
                  }} placeholder="https://..." />
                </CardContent>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const items = [
                  ...form.testimonials.items,
                  { quote: '', name: '', role: '', imageUrl: '' },
                ];
                update('testimonials', { items });
              }}
            >
              Add testimonial
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pricing">
          <AccordionTrigger>Pricing</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.pricing.title} onChange={(e) => update('pricing', { title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Plan name</Label>
              <Input value={form.pricing.planName} onChange={(e) => update('pricing', { planName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Price monthly</Label>
                <Input value={form.pricing.priceMonthly} onChange={(e) => update('pricing', { priceMonthly: e.target.value })} />
              </div>
              <div>
                <Label>Price yearly</Label>
                <Input value={form.pricing.priceYearly} onChange={(e) => update('pricing', { priceYearly: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Yearly note</Label>
              <Input value={form.pricing.yearlyNote} onChange={(e) => update('pricing', { yearlyNote: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Trial note</Label>
              <Input value={form.pricing.trialNote} onChange={(e) => update('pricing', { trialNote: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Features (one per line)</Label>
              <Textarea value={form.pricing.features.join('\n')} onChange={(e) => update('pricing', { features: e.target.value.split('\n').filter(Boolean) })} rows={10} />
            </div>
            <div className="grid gap-2">
              <Label>Note</Label>
              <Input value={form.pricing.note} onChange={(e) => update('pricing', { note: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>CTA button text</Label>
              <Input value={form.pricing.cta} onChange={(e) => update('pricing', { cta: e.target.value })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="faq">
          <AccordionTrigger>FAQ</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.faq.title} onChange={(e) => update('faq', { title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Contact prompt</Label>
              <Input value={form.faq.contactPrompt} onChange={(e) => update('faq', { contactPrompt: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Contact email</Label>
              <Input value={form.faq.contactEmail} onChange={(e) => update('faq', { contactEmail: e.target.value })} />
            </div>
            {form.faq.items.map((faq, i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-2">
                  <Label>Question</Label>
                  <Input value={faq.question} onChange={(e) => {
                    const items = [...form.faq.items];
                    items[i] = { ...items[i], question: e.target.value };
                    update('faq', { items });
                  }} />
                  <Label>Answer</Label>
                  <Textarea value={faq.answer} onChange={(e) => {
                    const items = [...form.faq.items];
                    items[i] = { ...items[i], answer: e.target.value };
                    update('faq', { items });
                  }} rows={2} />
                </CardContent>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const items = [
                  ...form.faq.items,
                  { question: '', answer: '' },
                ];
                update('faq', { items });
              }}
            >
              Add FAQ item
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cta">
          <AccordionTrigger>Final CTA</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.cta.title} onChange={(e) => update('cta', { title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Subtext</Label>
              <Input value={form.cta.subtext} onChange={(e) => update('cta', { subtext: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Button text</Label>
              <Input value={form.cta.buttonText} onChange={(e) => update('cta', { buttonText: e.target.value })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="footer">
          <AccordionTrigger>Footer</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>About text</Label>
              <Textarea
                rows={3}
                value={form.footer.aboutText}
                onChange={(e) => update('footer', { aboutText: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Contact email</Label>
              <Input
                value={form.footer.contactEmail}
                onChange={(e) => update('footer', { contactEmail: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Copyright name</Label>
              <Input value={form.footer.copyright} onChange={(e) => update('footer', { copyright: e.target.value })} />
            </div>
            <Label>Links: one per line, format &quot;Label|/path&quot;</Label>
            <Textarea
              value={form.footer.links.map((l) => `${l.label}|${l.href}`).join('\n')}
              onChange={(e) => update('footer', { links: e.target.value.split('\n').filter(Boolean).map((line) => {
                const [label, href] = line.split('|');
                return { label: label?.trim() || '', href: href?.trim() || '' };
              }) })}
              rows={4}
              placeholder="Log in|/auth"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog
        open={problemIconPickerBox !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProblemIconPickerBox(null);
            setProblemIconSearch('');
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {problemIconPickerBox !== null
                ? `Pick icon for Problem box ${problemIconPickerBox + 1}`
                : 'Pick icon'}
            </DialogTitle>
            <DialogDescription>
              Search by name, then click an icon to assign it. Icons are loaded from the same bucket as Admin → Icons.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search icons by name…"
                value={problemIconSearch}
                onChange={(e) => setProblemIconSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex-1 overflow-auto rounded-md border bg-muted/30 p-4 min-h-[280px]">
              {loadingIconPaths ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProblemIconPaths.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {appIconPaths.length === 0
                    ? 'No SVG files in the bucket. Upload icons in Admin → Icons (bucket: app-icons).'
                    : 'No icons match your search.'}
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {filteredProblemIconPaths.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => {
                        if (problemIconPickerBox === null) return;
                        const boxes = [...(form?.problem.boxes ?? [])];
                        boxes[problemIconPickerBox] = {
                          ...boxes[problemIconPickerBox],
                          icon: path,
                        };
                        update('problem', { boxes });
                        setProblemIconPickerBox(null);
                        setProblemIconSearch('');
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-muted/70 hover:border-muted-foreground/30 transition-colors"
                      title={displayNameForIconPath(path)}
                    >
                      <div className="h-14 w-14 flex items-center justify-center overflow-hidden rounded-md bg-muted/80 shrink-0">
                        <img
                          src={getAppIconPublicUrl(path)}
                          alt=""
                          className="h-10 w-10 object-contain pointer-events-none"
                          style={{ filter: 'brightness(0) opacity(0.85)' }}
                        />
                      </div>
                      <span className="text-xs truncate w-full text-center text-foreground/90 font-medium">
                        {displayNameForIconPath(path).slice(0, 14)}
                        {displayNameForIconPath(path).length > 14 ? '…' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
