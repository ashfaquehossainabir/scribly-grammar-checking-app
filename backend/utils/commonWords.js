/**
 * A few hundred of the most frequent words in everyday English. Our
 * dictionary (188k words, expanded from a base wordlist) carries no usage
 * frequency data, so on its own an edit-distance corrector can't tell an
 * everyday word like "wrong" apart from an obscure or archaic dictionary
 * entry that happens to be the same edit distance away. This list gives
 * the ranker a lightweight frequency signal: candidates on this list are
 * nudged ahead of equally-close candidates that aren't, so common words
 * are preferred over rare ones when nothing else distinguishes them.
 */
export const COMMON_WORDS = new Set(`
a about above across after again against all almost alone along already also
although always am among an and another any anyone anything are area around
as ask asked at away back bad be became because become been before began
begin behind being believe best better between big bit body book both bring
brought build building business but buy by call called came can cannot car
care case cause certain change child children city class clear close come
comes coming community company completely consider continue could country
course create cut day days dead deal death did die different difficult do
does doing done door down during each early easy eat effect eight either
else end enough even ever every everyone everything example experience eye
face fact family far father feel feeling few field figure final find fine
first five follow following food for force form found four free friend from
full further game gave general get gets getting girl give given go goes
going gone good got government great group grow growing had hand happen
happened hard has have having he head health hear heard help her here high
him himself his history home hour house how however human hundred idea if
important in include including information inside instead interest into is
issue it its itself job just keep kept kind know known large last late later
law lead least leave less let level life light like likely line little live
lived local long look looked looking lot love low made main major make
makes making man many may maybe me mean means meet member men might mind
minute miss moment money month more morning most mother move much music
must my name nation near need needed never new news next night no none
north not nothing now number of off office often oh old on once one only
onto open or order other others our out outside over own part particular
pay people perhaps person phone place plan play point political poor
possible power present president pretty probably problem process program
provide public purpose put question quite quickly race rather reach read
real really reason recent record remember report result return right room
run said same saw say says school season second see seem seen sense serve
set several she should show side simple since single sit situation six
small so social some someone something sometimes son soon sort sound south
space speak special specific stand start state still stop story strong
student study such system take taken talk tell ten than that the their them
then there these they thing think third this those though thought three
through time today together told too took toward town true try turn two
under understand until up upon us use used using very view voice wait want
war water way we week well went were what when where whether which while
white who whole why will with within without woman women word words work
world would write wrong year years yes yet you young your
`.split(/\s+/).filter(Boolean));
