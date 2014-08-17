package edu.mit.nlp.segmenter;

import edu.mit.nlp.ling.*;
import edu.mit.nlp.util.StrIntMap;
import edu.mit.nlp.util.Utils;
import edu.mit.nlp.util.Utils.WindowType;
import mt.Matrix;
import org.apache.log4j.Logger;
import org.jdom.Element;
import smt.FlexCompColMatrix;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

/**
 * Created by IntelliJ IDEA.
 * User: Igor
 * Date: Apr 22, 2005
 * Time: 11:32:38 AM
 * To change this template use File | Settings | File Templates.
 */
public class TextWrapper {
    static Logger logger = Logger.getLogger(TextWrapper.class);

    /**
     * text_:  arraylist of word windows, represented by indices of word stems, with trigger words excluded
     * rawText_: arraylist of sentences, represented as lists of lexical items
     */

    protected boolean useTags_;
    protected boolean useStems_;
    protected LexMap lexMap_;
    protected Text text_;
    protected ArrayList rawText_; //List of ArrayLists of Lexical Items
    protected List sentenceBreakList_;
    protected ArrayList<Integer> window2SentenceBreakMap_;
    protected ArrayList<Integer> sentenceStartList_;    //List of sentence starts
    protected boolean useASRTypeParsing_ = false;
    protected double msLectureLength_;
    protected String POSDelimiter_ = "_";
    protected boolean useChoiStyleBreaks_;
    protected static final String ChoiBreak = "==========";
    protected int windowLength_;
    protected int sentenceCount_; // Number of sentences (not windows) in the original text
    protected int wordTokenCount_;
    protected boolean storeRawText_;
    protected String dataFileName_;
    public static final int DEFAULT_WINDOW_LENGTH = 20;


    /*-----------------------------Constructors---------------------*/

    public TextWrapper() {
        useTags_ = false;
        useStems_ = false;
        lexMap_ = new LexMap();
        sentenceBreakList_ = new ArrayList();
        rawText_ = new ArrayList();
        text_ = new Text();
        window2SentenceBreakMap_ = new ArrayList<Integer>();
        sentenceStartList_ = new ArrayList<Integer>();
        windowLength_ = 0;
        sentenceCount_ = 0;
        storeRawText_ = false;
        useChoiStyleBreaks_ = false;
        dataFileName_ = "";
    }

    public TextWrapper(String filename) {
        this();
        dataFileName_ = filename;
    }

    public Object clone(){
        TextWrapper out = new TextWrapper();
        out.useTags_ = useTags_;
        out.useStems_ = useStems_;
        out.lexMap_ = new LexMap(); out.lexMap_.addLexMap(lexMap_);
        out.text_ = (Text) text_.clone();
        out.rawText_ = (ArrayList) rawText_.clone();
        out.sentenceBreakList_ = new ArrayList(sentenceBreakList_);
        out.window2SentenceBreakMap_ = (ArrayList<Integer>) window2SentenceBreakMap_.clone();
        out.sentenceStartList_ = (ArrayList<Integer>) sentenceStartList_;    //List of sentence starts
        out.useASRTypeParsing_ =  useASRTypeParsing_;
        out.msLectureLength_ = msLectureLength_;
        out.POSDelimiter_ = POSDelimiter_;
        out.useChoiStyleBreaks_ = useChoiStyleBreaks_;
        out.windowLength_ = windowLength_;
        out.sentenceCount_ = sentenceCount_;
        out.wordTokenCount_ = wordTokenCount_;
        out.storeRawText_ = storeRawText_;
        out.dataFileName_ = dataFileName_;
        return out;
    }

    public TextWrapper (TextWrapper in){
        useTags_ = in.useTags_;
        useStems_ = in.useStems_;
        lexMap_ = new LexMap(); lexMap_.addLexMap(in.lexMap_);
        text_ = (Text) in.text_.clone();
        rawText_ = (ArrayList) in.rawText_.clone();
        sentenceBreakList_ = new ArrayList(in.sentenceBreakList_);
        window2SentenceBreakMap_ = (ArrayList<Integer>) in.window2SentenceBreakMap_.clone();
        sentenceStartList_ = (ArrayList<Integer>) in.sentenceStartList_;    //List of sentence starts
        useASRTypeParsing_ =  in.useASRTypeParsing_;
        msLectureLength_ = in.msLectureLength_;
        POSDelimiter_ = in.POSDelimiter_;
        useChoiStyleBreaks_ = in.useChoiStyleBreaks_;
        windowLength_ = in.windowLength_;
        sentenceCount_ = in.sentenceCount_;
        wordTokenCount_ = in.wordTokenCount_;
        storeRawText_ = in.storeRawText_;
        dataFileName_ = in.dataFileName_;
    }


    /*-----------------------------Accessors------------------------*/

    public void setPOSDelimiter(String POSDelimiter) {
        POSDelimiter_ = POSDelimiter;
    }

    public void useASRTypeParsing() {
        useASRTypeParsing_ = true;
        POSDelimiter_ = "/";
    }

    public void useChoiBreaks() {
        useChoiStyleBreaks_ = true;
    }

    public void useTags() {
        useTags_ = true;
    }

    public void storeRawText() {
        storeRawText_ = true;
    }

    public List getText() {
        return text_;
    }

    public List getRawText() {
        return rawText_;
    }

    public List getStemmedRawText() {
        List stemmedRawText = new ArrayList();
        for (int i = 0; i < rawText_.size(); i++) {
            ArrayList<LexicalItem> sent = (ArrayList<LexicalItem>) rawText_.get(i);
            List stemmedSent = new ArrayList();
            for (int j = 0; j < sent.size(); j++) {
                LexicalItem lexItem = sent.get(j);
                String stem = Utils.stemWord(lexMap_.getWord(lexItem.getWord()));
                int stemId = lexMap_.getStemId(stem);
                if (stemId == -1) {
                    stemId = lexMap_.addStem(stem);
                }
                stemmedSent.add(new LexicalItem(stemId, lexItem.getTag()));
            }
            stemmedRawText.add(stemmedSent);
        }

        return stemmedRawText;
    }

    public String getTextFilename() {
        return dataFileName_;
    }

    public LexMap getLexMap() { return lexMap_;    }
    public void setLexMap(LexMap lexmap) { this.lexMap_ = lexmap; }

    public List getReferenceSeg() {
        return sentenceBreakList_;
    }

    public int getWordCount() {
        int wCount = 0;
        for (int i = 0; i < rawText_.size(); i++) {
            wCount += ((ArrayList<LexicalItem>) rawText_.get(i)).size();
        }

        return wCount;
    }

    /**
     * @return number of sentences (not windows) in the original text
     */
    public int getSentenceCount() {
        return sentenceCount_;
    }

    public int getWindowLength() {
        return windowLength_;
    }

    public double getLectureDuration() {
        return msLectureLength_;
    }

    public int getWindowCount() {
        return text_.size();
    }

    public int getTotalWordTokenCount() {
        return wordTokenCount_;
    }

    public List<Integer> getSentenceWordOffsetList() {
        return sentenceStartList_;
    }


    /*-----------------------String Output Functions----------------*/

    public static String toString(List list) {
        StringBuffer strBuffer = new StringBuffer();
        for (int i = 0; i < list.size(); i++) {
            strBuffer.append(list.get(i));
            if (i != list.size() - 1) {
                strBuffer.append(" ");
            }
        }
        return strBuffer.toString();
    }

    public String getWindowString(int i) {
        if (i < 0 || i > text_.size()) {
            return null;
        }
        StringBuffer t = new StringBuffer();
        List<Integer> sent = (List<Integer>) text_.get(i);
        for (int j = 0; j < sent.size(); j++) {

            if (useStems_) {
                t.append(lexMap_.getStem(sent.get(j)));
            } else {
                t.append(lexMap_.getWord(sent.get(j)));
            }

            if (j != sent.size() - 1) {
                t.append(" ");
            }
        }
        return t.toString();
    }

    public String getSentenceString(int i) {
        if (i < 0 || i > rawText_.size()) {
            return null;
        }
        StringBuffer t = new StringBuffer();
        List<LexicalItem> sent = (List<LexicalItem>) rawText_.get(i);
        for (int j = 0; j < sent.size(); j++) {
            t.append(lexMap_.getWord(sent.get(j).getWord()));
            if (j != sent.size() - 1) {
                t.append(" ");
            }
        }
        return t.toString();
    }

    public String getSegmentedText(List<Integer> seg) {
        StringBuffer t = new StringBuffer();
        t.append("\n");
        for (int i = 0; i < text_.size(); i++) {
            if (seg.contains(Integer.valueOf(i))) {
                t.append("\n====\n");
            }
            t.append(Sentence.getSentenceString(lexMap_, text_.get(i), useStems_));
            t.append("\n");
        }
        t.append("\n====\n");
        return t.toString();
    }

    public String getRawSegmentedText(List<Integer> seg) {

        if (!storeRawText_) {
            return "";
        }

        StringBuffer t = new StringBuffer();
        t.append(ChoiBreak + "\n");
        for (int i = 0; i < rawText_.size(); i++) {
            if (seg.contains(Integer.valueOf(i))) {
                t.append(ChoiBreak + "\n");
            }

//            if (sentenceBreakList_.contains(Integer.valueOf(i))) {
//                t.append("\n***ref***\n");
//            }

            List<LexicalItem> sent = (List<LexicalItem>) rawText_.get(i);
            for (int j = 0; j < sent.size(); j++) {
                t.append(lexMap_.getWord(sent.get(j).getWord()));
                if (j != sent.size() - 1) {
                    t.append(" ");
                }
            }
            t.append("\n");
        }
        t.append(ChoiBreak);
        return t.toString();
    }

    public String getRawSegmentedAnnotatedText(List<Integer> seg, ArrayList<String> annotatedText) {
        if (!storeRawText_) {
            return "";
        }

        StringBuffer t = new StringBuffer();
        t.append("\n");
        for (int i = 0; i < annotatedText.size(); i++) {
            if (seg.contains(Integer.valueOf(i))) {
                t.append("\n==hyp==\n");
            }
            if (sentenceBreakList_.contains(Integer.valueOf(i))) {
                t.append("\n***ref***\n");
            }

            t.append(annotatedText.get(i));
            t.append("\n");
        }
        t.append("\n====\n");
        return t.toString();
    }

    public void ouputSegmentedASRText(String outputFile, List<Integer> seg, ArrayList keyWordLists,
                                      ArrayList<String> titleKeyWordStems) {
        //output in XML format

        if (!storeRawText_) {
            return;
        }

        TreeMap<String, String> stemMap = getStem2MostFrequentWordMap();
        ArrayList<String> titleKeyWords = Utils.mapList(titleKeyWordStems, stemMap);

        int currentSegmentId = 1;
        Element root = new Element("document").setAttribute("fileName", outputFile);
        Element lecture = new Element("lecture").setAttribute("title", "NA").setAttribute("keywords", toString(titleKeyWords));
        root.addContent(lecture);

        StringBuffer t = new StringBuffer();
        t.append("\n");
        Element segment = null;

        ArrayList<String> keyWordStems = (ArrayList<String>) keyWordLists.get(0);

        for (int i = 0; i < rawText_.size(); i++) {
            if (seg.contains(Integer.valueOf(i))) {
                int segmentStartSentId = 0, segmentEndSentId = 0;
                if (currentSegmentId == 1) {
                    segmentStartSentId = 0;
                } else {
                    segmentStartSentId = seg.get(currentSegmentId - 2).intValue();
                }
                segmentEndSentId = i - 1;
                TreeMap<String, String> localStemMap = getStem2MostFrequentWordMap(segmentStartSentId, segmentEndSentId);
                ArrayList<String> localKeyWords = Utils.mapList(keyWordStems, localStemMap);
                segment = new Element("segment").setAttribute("id", "" + currentSegmentId)
                        .setAttribute("title", toString(localKeyWords)).setText(t.toString());
                lecture.addContent(segment);

                keyWordStems = (ArrayList<String>) keyWordLists.get(currentSegmentId);
                currentSegmentId++;
                t.setLength(0); //clear the buffer
                t.append("\n");
            }

            List<LexicalItem> sent = (List<LexicalItem>) rawText_.get(i);
            for (int j = 0; j < sent.size(); j++) {
                LexicalItem lexItem = sent.get(j);
                long startTime = (long) lexItem.getStartTime();
                long endTime = (long) lexItem.getEndTime();
                String word = lexMap_.getWord(lexItem.getWord());

                String line = startTime + " " + endTime + " " + word;
                t.append(line + "\n");
            }
        }


        if (t.length() > 0) {
            int segmentStartSentId = 0, segmentEndSentId = 0;
            if (currentSegmentId == 1) {
                segmentStartSentId = 0;
            } else {
                segmentStartSentId = seg.get(currentSegmentId - 2).intValue();
            }
            segmentEndSentId = rawText_.size() - 1;
            TreeMap<String, String> localStemMap = getStem2MostFrequentWordMap(segmentStartSentId, segmentEndSentId);
            ArrayList<String> localKeyWords = Utils.mapList(keyWordStems, localStemMap);
            //List lst = Utils.removeNullElements(Arrays.asList(techWords));
            segment = new Element("segment").setAttribute("id", "" + currentSegmentId)
                    .setAttribute("title", toString(localKeyWords)).setText(t.toString());
            lecture.addContent(segment);
        }

        Utils.serialize2File(outputFile, root);
    }


    /*-----------------------------Mapping Functions---------------------*/

    /**
     * Converts sentences-based segmentation to a word-based one
     * The final (implicit) boundary is added
     *
     * @param seg
     * @return
     */
    public List<Integer> convert2WordBasedSegmentation(List<Integer> seg) {
        List<Integer> wordOffsetList = getSentenceWordOffsetList();
        List<Integer> wSeg = new ArrayList<Integer>();
        for (Integer bound : seg) {
            if (bound.intValue() >= wordOffsetList.size()) {
                continue;
            }
            Integer wBound = wordOffsetList.get(bound.intValue());
            wSeg.add(wBound);
        }

        int lastBound = wSeg.get(wSeg.size() - 1).intValue();
        int wc = getWordCount();
        if (wc < lastBound) {
            System.out.println("Warning: Last boundary exceeds Lecture Word Count!");
            System.exit(1);
        }

        if (wc > lastBound) {
            wSeg.add(Integer.valueOf(wc));
        }

        return wSeg;
    }

    public double[][] createWordOccurrenceTable() {
        return createWordOccurrenceTable(createWordOccurrenceMatrix2());
    }

    protected double[][] createWordOccurrenceTable(Matrix occurMatrix) {
        int[] rows = new int[occurMatrix.numRows()];
        for (int i = 0; i < rows.length; i++) {
            rows[i] = i;
        }
        int[] cols = new int[occurMatrix.numColumns()];
        for (int i = 0; i < cols.length; i++) {
            cols[i] = i;
        }
        double[][] occurTable = new double[occurMatrix.numRows()][occurMatrix.numColumns()];
        occurMatrix.get(rows, cols, occurTable);
        return occurTable;
    }



    public Matrix createWordOccurrenceMatrix2() {
        //Get the sparse matrix representation
        int nRows = 0;
        if (!useStems_) {
            nRows = lexMap_.getWordLexiconSize();
        } else {
            nRows = lexMap_.getStemLexiconSize();
        }

        FlexCompColMatrix M = new FlexCompColMatrix(nRows, text_.size());
        int windowCount = 0;
        for (Iterator itr = text_.iterator(); itr.hasNext();) {
            ArrayList window = (ArrayList) itr.next();
            for (int i = 0; i < window.size(); i++) {
                Integer id = (Integer) window.get(i);
                M.add(id.intValue(), windowCount, 1);
            }
            windowCount++;
        }
        return M;
    }

    public Matrix createNgramOccurrenceMatrix(List ngramStringList, int highestNgramOrder, boolean ngramsStemmed) {

        if (ngramsStemmed && !useStems_) {
            //No stem map accumulated at this point
            return null;
        }

        //Get the sparse matrix representation
        int nRows = ngramStringList.size();

        StrIntMap wordMap = null;
        if (ngramsStemmed) {
            wordMap = lexMap_.getStemMap();
        } else {
            wordMap = lexMap_.getWordMap();
        }

        TreeMap<Ngram, Integer> indexMap = new TreeMap<Ngram, Integer>();
        for (int i = 0; i < ngramStringList.size(); i++) {
            String ngramString = (String) ngramStringList.get(i);
            String[] words = ngramString.split("\\s");
            Ngram ngram = Ngram.getNgram(words, wordMap);
            if (ngram == null) {
                System.out.println(ngramString + " was not found in the wordMap!");
                System.exit(1);
            }
            indexMap.put(ngram, Integer.valueOf(i));
        }


        FlexCompColMatrix M = new FlexCompColMatrix(nRows, text_.size());

        StrIntMap origWordMap = lexMap_.getWordMap();

        List sent2WinMap = getSentence2WindowBreakMap();

        //Iterate through the raw, unstemmed, sentence-separated text with stopwords left intact
        for (int i = 0; i < rawText_.size(); i++) {
            ArrayList window = (ArrayList) rawText_.get(i);
            for (int ngramOrder = 1; ngramOrder <= highestNgramOrder; ngramOrder++) {
                for (int j = 0; j < window.size() - ngramOrder + 1; j++) {
                    int[] wordIds = new int[ngramOrder];
                    for (int k = 0; k < ngramOrder; k++) {
                        wordIds[k] = ((LexicalItem) window.get(j + k)).getWord();
                    }

                    Ngram ngram = new Ngram(wordIds);
                    if (useStems_) {
                        String[] words = Ngram.getStringArray(ngram, origWordMap);
                        for (int k = 0; k < words.length; k++) {
                            words[k] = Utils.stemWord(words[k]);
                        }
                        //Translate to the stem wordMap
                        ngram = Ngram.getNgram(words, wordMap);
                    }

                    if (indexMap.containsKey(ngram)) {
                        int index = indexMap.get(ngram).intValue();
                        int windowId = ((Integer) sent2WinMap.get(i)).intValue();

                        if (index >= M.numRows()) {
                            logger.warn("Occurrence Matrix: Ngram index out of range: " + index
                                    + ",  " + M.numRows());
                        }

                        if (windowId >= M.numColumns()) {
                            logger.warn("Occurrence Matrix: Mapped Window index out of range: " +
                                    windowId + ", " + M.numColumns());
                        }

                        M.add(index, windowId, 1);
                    }
                }
            }

        }

        return M;
    }

    public Matrix createWordOccurrenceMatrix2(List wordList) {
        //Get the sparse matrix representation
        int nRows = wordList.size();
        StrIntMap wordMap = null;

        TreeMap<String, Integer> indexMap = new TreeMap<String, Integer>();
        for (int i = 0; i < wordList.size(); i++) {
            indexMap.put((String) wordList.get(i), Integer.valueOf(i));
        }

        if (!useStems_) {
            wordMap = lexMap_.getWordMap();
        } else {
            wordMap = lexMap_.getStemMap();
        }

        FlexCompColMatrix M = new FlexCompColMatrix(nRows, text_.size());
        int windowCount = 0;
        for (Iterator itr = text_.iterator(); itr.hasNext();) {
            ArrayList window = (ArrayList) itr.next();
            for (int i = 0; i < window.size(); i++) {
                Integer id = (Integer) window.get(i);
                String word = wordMap.get(id.intValue());
                if (word == null) {
                    logger.warn("Couldn't find the id in the wordMap!");
                    return null;
                }
                if (indexMap.containsKey(word)) {
                    int index = indexMap.get(word).intValue();
                    M.add(index, windowCount, 1);
                }
            }
            windowCount++;
        }
        return M;
    }

    /**
     * Return the raw sentence string
     *
     * @return
     */
    public TreeMap<String, String> getStem2MostFrequentWordMap() {
        return getStem2MostFrequentWordMap(0, rawText_.size() - 1);
    }

    /**
     * @param startSentId
     * @param endSentId
     * @return
     */
    public TreeMap<String, String> getStem2MostFrequentWordMap(int startSentId, int endSentId) {
        //Make Mapping from stems to most frequently associated words
        //stem==>word==>count
        TreeMap<String, TreeMap<String, Integer>> stemFrequencyMap = new TreeMap<String, TreeMap<String, Integer>>();
        for (int i = startSentId; i < rawText_.size() && i <= endSentId; i++) {
            List<LexicalItem> sent = (List<LexicalItem>) rawText_.get(i);
            for (int j = 0; j < sent.size(); j++) {
                LexicalItem lexItem = sent.get(j);
                String word = lexMap_.getWord(lexItem.getWord());
                String stem = Utils.stemWord(word);
                if (stemFrequencyMap.get(stem) == null) {
                    stemFrequencyMap.put(stem, new TreeMap<String, Integer>());
                }
                TreeMap<String, Integer> wordCountMap = stemFrequencyMap.get(stem);
                if (wordCountMap.get(word) == null) {
                    wordCountMap.put(word, Integer.valueOf(1));
                } else {
                    int wordCount = wordCountMap.get(word).intValue();
                    wordCount++;
                    wordCountMap.put(word, Integer.valueOf(wordCount));
                }
            }
        }


        TreeMap<String, String> stemMap = new TreeMap<String, String>();
        for (String stem : stemFrequencyMap.keySet()) {
            TreeMap<String, Integer> map = stemFrequencyMap.get(stem);
            ArrayList entries = new ArrayList(map.entrySet());
            Collections.sort(entries, new Comparator() {//descending order
                public int compare(Object w1, Object w2) {
                    return ((Map.Entry<String, Integer>) w2).getValue().compareTo(((Map.Entry<String, Integer>) w1).getValue());

                }
            });

            if (entries != null && !entries.isEmpty()) {
                String word = (String) ((Map.Entry) entries.get(0)).getKey();
                stemMap.put(stem, word);
            }
        }

        return stemMap;
    }

    public List getSentence2WindowBreakMap() {
        ArrayList<Integer> sentence2WindowBreakMap = new ArrayList<Integer>();
        if (windowLength_ <= 0) {
            return null;
        }
        int nWindows = getWindowCount();
        int nSentences = getSentenceCount();

        for (int i = 0; i < nSentences; i++) {
            int sentenceWordStartIndex = sentenceStartList_.get(i).intValue();

            //flipped 08-08-05
            if (sentenceWordStartIndex % windowLength_ > (windowLength_ / 2)) {
                int mappedIndex = (int) Math.ceil((1.0 * sentenceWordStartIndex) / windowLength_);
                if (mappedIndex >= nWindows) {
                    mappedIndex = nWindows - 1;
                }
                sentence2WindowBreakMap.add(Integer.valueOf(mappedIndex));
            } else {
                int mappedIndex = (int) Math.floor((1.0 * sentenceWordStartIndex) / windowLength_);
                if (mappedIndex >= nWindows) {
                    mappedIndex = nWindows - 1;
                }
                sentence2WindowBreakMap.add(Integer.valueOf(mappedIndex));
            }
        }
        return sentence2WindowBreakMap;
    }

    public List getWindow2SentenceBreakMap() {

        window2SentenceBreakMap_.clear();

        if (windowLength_ <= 0) {
            return null;
        }
        int j = 0;
        for (int i = 0; i < text_.size(); i++) {

            if (j >= sentenceStartList_.size()) {
                window2SentenceBreakMap_.add(Integer.valueOf(sentenceStartList_.size() - 1));
                break;
            }

            while (j < sentenceStartList_.size() && sentenceStartList_.get(j).intValue() < i * windowLength_) {
                j++;
            }

            if (j >= sentenceStartList_.size()) {
                window2SentenceBreakMap_.add(Integer.valueOf(sentenceStartList_.size() - 1));
                break;
            }

            int closestSentenceId = 0;
            if (j > 0) {
                int cSent = sentenceStartList_.get(j).intValue();
                int pSent = sentenceStartList_.get(j - 1).intValue();
                int targetWordCount = i * windowLength_;
                // logger.info("target: " + targetWordCount + " c " + cSent + " p " + pSent);
                closestSentenceId = (cSent - targetWordCount < targetWordCount - pSent) ? j : j - 1;
                //  logger.info(Sentence.getSentenceString(lexMap_, text_.get(i)) + " " + closestSentenceId+1);
            }
            window2SentenceBreakMap_.add(Integer.valueOf(closestSentenceId + 1));
        }
        window2SentenceBreakMap_.add(Integer.valueOf(sentenceStartList_.size()));
        return window2SentenceBreakMap_;
    }


    /*-----------------------------Input/Formatting Functions------------*/

//todo: check
    public void removeStopWords(List<String> stopWordsList) {
        List stopWordIdList = new ArrayList<Integer>(stopWordsList.size());
        for (String stopWord : stopWordsList) {
            int id = -1;
            if (!useStems_) {
                id = lexMap_.getWordId(stopWord);
            } else {
                id = lexMap_.getStemId(stopWord);
            }
            if (id != -1) {
                stopWordIdList.add(Integer.valueOf(id));
            }
        }
        for (Iterator itr = text_.iterator(); itr.hasNext();) {
            ArrayList window = (ArrayList) itr.next();
            window.removeAll(stopWordIdList);
        }
    }

    public void parse() {
        parseFile2(dataFileName_, WindowType.SENTENCE, 0, useTags_, false);
    }

    public void parse(boolean useStems) {
        useStems_ = useStems;
        parseFile2(dataFileName_, WindowType.SENTENCE, 0, useTags_, useStems);

    }

    public void parseWindows(int windowLength) {

        parseFile2(dataFileName_, WindowType.WINDOW, windowLength, useTags_, false);

    }

    public void parseWindows(int windowLength, boolean useStems) {
        useStems_ = useStems;
        parseFile2(dataFileName_, WindowType.WINDOW, windowLength, useTags_, useStems);
    }

    public Text parseFile2(String fileName, WindowType repType, int windowLength, boolean useTags, boolean useStems) {

        //todo: storeRawText

        if (repType == WindowType.WINDOW && windowLength <= 0) {
            logger.error("Invalid window length " + windowLength);
            return null;
        } else if (repType == WindowType.WINDOW) {
            windowLength_ = windowLength;
        }

        InputStreamReader isr = null;
        Sentence window = null;
        ArrayList lexItemList = null;
        Text sentList = new Text();
        int sentCount = 0;
        int cumulativeWordCount = 0;

        if (storeRawText_) {
            lexItemList = new ArrayList();
        }

        if (repType == WindowType.WINDOW) {
//window = new ArrayList(windowLength);
            window = new Sentence(windowLength);
        }

        try {
            isr = new InputStreamReader(new FileInputStream(fileName), "UTF-8");
            BufferedReader rdr = new BufferedReader(isr);
            String line = rdr.readLine();
            while (line != null) {
                if (useChoiStyleBreaks_) {
                    if (line.startsWith(ChoiBreak)) {
                        if (sentList.size() != 0) {
                            sentenceBreakList_.add(new Integer(sentCount));
                        }
                        line = rdr.readLine();
                        continue;
                    }
                } else {
                    if (line.matches(".*<slide.*?>.*")) {
                        line = line.replaceFirst("<slide.*?>", "").trim();
                        if (sentList.size() != 0) {
                            sentenceBreakList_.add(new Integer(sentCount));
                        }
//Break List is built relative to sentences
                    }

                    if (line.matches(".*<section.*?>.*")) {
                        line = line.replaceFirst("<section.*?>", "").trim();
                        if (sentList.size() != 0) {
                            sentenceBreakList_.add(new Integer(sentCount));
//Break List is built relative to sentences
                        }
                        line = rdr.readLine();
                        continue;
                    } else if (line.matches(".*</section.*?>.*")) {
                        line = rdr.readLine();
                        continue;
                    }
                }

                sentenceStartList_.add(Integer.valueOf(cumulativeWordCount));

                if (repType == WindowType.SENTENCE) {
                    window = new Sentence(DEFAULT_WINDOW_LENGTH);
                }

                if (storeRawText_) {
                    lexItemList = new ArrayList(DEFAULT_WINDOW_LENGTH);
                }

//line = removeSpecialSymbols(line, useTags);
                line = Utils.removeSpecialSymbols(line, useTags, POSDelimiter_);

                StringTokenizer tok1 = new StringTokenizer(line, " \t");

                while (tok1.hasMoreTokens()) {
                    if (repType == WindowType.WINDOW && window.size() == windowLength) {
                        sentList.add(window);
                        window = new Sentence(windowLength);

                    }

                    String wordToken = tok1.nextToken().trim();


                    if (!useTags) {
                        int id;

                        if (storeRawText_) {
                            id = lexMap_.addWord(wordToken);
                            lexItemList.add(new LexicalItem(id));
                        }

                        if (!useStems) {
                            id = lexMap_.addWord(wordToken);
                        } else {
                            id = lexMap_.addStem(Utils.stemWord(wordToken));
                        }
                        window.add(new Integer(id));

                    } else {// use the Tags
                        //String[] strArr = wordToken.split("_");
                        // String[] strArr = wordToken.split("/");
                        String[] strArr = wordToken.split(POSDelimiter_);
                        if ((strArr.length < 2) || (strArr.length > 2) ||
                                (strArr[0].trim()).compareTo("") == 0 ||
                                (strArr[1].trim()).compareTo("") == 0) {
                            //System.out.println("Warning: Possible Error in Parsing: " + line);
                            //System.out.println("Warning: Possible Error in Parsing: " + wordToken + ": " + line);
                            continue;
//todo
//handle separate cases
                        }

                        if (storeRawText_) {
                            int id = lexMap_.addWord(strArr[0]);
                            int tagId = lexMap_.addTag(strArr[1]);
                            lexItemList.add(new LexicalItem(id, tagId));
                        }

                        int id;
                        if (!useStems) {
                            id = lexMap_.addWord(strArr[0]);
                        } else {
                            id = lexMap_.addStem(Utils.stemWord(strArr[0]));
                        }

                        window.add(new Integer(id));

                    }
                    cumulativeWordCount++;
                }


                if (repType == WindowType.SENTENCE) {
                    sentList.add(window);
                }

                rawText_.add(lexItemList);

                line = rdr.readLine();
                sentCount++;

                if (sentCount % 10000 == 0) {
                    System.out.println(sentCount + " sentences processed");
                }

            }//End of Reading Loop

            if (repType == WindowType.WINDOW && window.size() > 0) { //remains
                sentList.add(window);
            }

            if (!useChoiStyleBreaks_) {
                sentenceBreakList_.add(new Integer(sentCount));
            }
//Break List is relative to sentences
//Break k ==> break before sentence k
//The last break is after the last sentence
//Sentence ids are 0-based

            rdr.close();
        } catch (IOException e) {
            System.out.println(e.getMessage());
            System.exit(1);
        }

        sentenceCount_ = sentCount;
        wordTokenCount_ = cumulativeWordCount;
        text_ = sentList;
        return sentList;
    }
}
