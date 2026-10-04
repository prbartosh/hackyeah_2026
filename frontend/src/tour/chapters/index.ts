// Kolejność rozdziałów w przewodniku. Każdy rozdział w osobnym pliku, żeby treść można było pisać równolegle.
import startChapter from '@/tour/chapters/start'
import czatChapter from '@/tour/chapters/czat'
import zasobnikChapter from '@/tour/chapters/zasobnik'
import innowacjaChapter from '@/tour/chapters/innowacja'
import testerChapter from '@/tour/chapters/tester'
import middlemanChapter from '@/tour/chapters/middleman'
import kreatorChapter from '@/tour/chapters/kreator'
import wspolpracaChapter from '@/tour/chapters/wspolpraca'
import siecChapter from '@/tour/chapters/siec'
import panelChapter from '@/tour/chapters/panel'
import type { TourChapter } from '@/tour/types'

export const chapters: TourChapter[] = [
  startChapter,
  czatChapter,
  zasobnikChapter,
  innowacjaChapter,
  testerChapter,
  middlemanChapter,
  kreatorChapter,
  wspolpracaChapter,
  siecChapter,
  panelChapter,
]
