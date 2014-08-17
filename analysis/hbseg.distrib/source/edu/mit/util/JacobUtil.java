package edu.mit.util;

import java.util.ArrayList;

public class JacobUtil {
//     public static double getNumericOption(String[] options, char flag, double defval) throws Exception {
// 	String soption = weka.core.Utils.getOption(flag,options);
// 	double output = defval;
// 	if (soption.length() != 0)
// 	    output = Double.parseDouble(soption);
// 	return output;	    
//     }
//     public static String getStringOption(String[] options, char flag, String defval) throws Exception {
// 	String soption = weka.core.Utils.getOption(flag,options);
// 	String output = (soption.length() > 0)?soption:defval;
// 	return output;
//     }
//     public static double[] getSeqOption(String[] options, char flag, double[] defval) throws Exception {
//         String s = weka.core.Utils.getOption(flag,options);
//         double[] output = defval;
//         if (s.length() != 0) output = getNumArray(s);
//         return output;
//     }
    /** get an array from a string like [1, 2, 10, 4] **/
    public static ArrayList getIntArray(String array_string){
        String doods[] = array_string.substring(1,array_string.length()-1).split(", ");
        ArrayList list = new ArrayList(doods.length);
        for (int i = 0;i < doods.length; i++) list.add(new Integer(doods[i]));
        return list;
    }

    public static String formatArray(String fmtstring, String delimiter, double[] array){
        StringBuffer output = new StringBuffer();
        if (array.length > 0) {        
            for (int i = 0; i < array.length-1; i++){
                output.append(String.format(fmtstring,array[i])+delimiter);
            }
            output.append(String.format(fmtstring,array[array.length-1]));
        }
        return new String(output);
    }
    public static String formatArray(String fmtstring, String delimiter, int[] array){
        StringBuffer output = new StringBuffer();
        if (array.length > 0) {
            for (int i = 0; i < array.length-1; i++){
                output.append(String.format(fmtstring,array[i])+delimiter);
            }
            output.append(String.format(fmtstring,array[array.length-1]));
        }
        return new String(output);
    }
    public static String formatArray(String fmtstring, String delimiter, float[] array){
        StringBuffer output = new StringBuffer();
        if (array.length > 0) {
            for (int i = 0; i < array.length-1; i++){
                output.append(String.format(fmtstring,array[i])+delimiter);
            }
            output.append(String.format(fmtstring,array[array.length-1]));
        }
        return new String(output);
    }
    public static String formatArray(String delimiter, String[] array){
        StringBuffer output = new StringBuffer();
        if (array.length > 0) {
            for (int i = 0; i < array.length-1; i++){
                output.append(array[i]+delimiter);
            }
            output.append(array[array.length-1]);
        }
        return new String(output);
    }
    public static String formatArray(float[] array){
        return formatArray("%.1e"," ",array);
    }

    public static String formatArray(double[] array){
        return formatArray("%.1e"," ",array);
    }

    public static String formatArray(int[] array){
        return formatArray("%d"," ",array);
    }

    public static String formatMatrix(String fmtstring, String delimiter, int[][] array){
        StringBuffer output = new StringBuffer();
        for (int i =0 ;i < array.length; i++)
            output.append(formatArray(fmtstring,delimiter,array[i])+"\n");
        return new String(output);
    }

    public static String formatMatrix(int[][] mat){
        StringBuffer output = new StringBuffer();
        for (int i =0 ;i < mat.length; i++)
            output.append(formatArray(mat[i])+"\n");
        return new String(output);
    }

    public static String formatMatrix(float[][] mat){
        StringBuffer output = new StringBuffer();
        for (int i =0 ;i < mat.length; i++)
            output.append(formatArray(mat[i])+"\n");
        return new String(output);
    }

    public static String formatMatrix(double[][] mat){
        StringBuffer output = new StringBuffer();
        for (int i =0 ;i < mat.length; i++)
            output.append(formatArray(mat[i])+"\n");
        return new String(output);
    }


    public static String formatMatrix(String fmtstring, String delimiter, float[][] array){
        StringBuffer output = new StringBuffer();
        for (int i =0 ;i < array.length; i++)
            output.append(formatArray(fmtstring,delimiter,array[i])+"\n");
        return new String(output);
    }

    public static String formatMatrix(String fmtstring, String delimiter, double[][] array){
        StringBuffer output = new StringBuffer();
        for (int i =0 ;i < array.length; i++)
            output.append(formatArray(fmtstring,delimiter,array[i])+"\n");
        return new String(output);
    }
    
    public static double[] getNumArray(String spec) throws Exception {
        //spec = "{MIN,MAX,NUM,[+,*]}"
        int len = spec.length();
        //        spec = spec.substring(1,len-1);
        //        System.out.println("parsing: "+spec.substring(1,len-1));
        String[] parts = spec.split(",");
        assert (parts.length == 4 || parts.length ==1);
        if (parts.length == 1){
            double[] output = new double[1]; output[0] = Double.parseDouble(parts[0]); return output;
        }
        double min = Double.parseDouble(parts[0]);
        double max = Double.parseDouble(parts[1]);
        int num = Integer.parseInt(parts[2]);
        double[] out = new double[num];
        if (!(parts[3].equals("A") || parts[3].equals("M")))
            System.err.println("unacceptable increment rule:_"+parts[3]+"_");
        
        assert (parts[3].equals("A") || parts[3].equals("M"));
        out[0] = min; out[out.length - 1] = max;
        if (parts[3].equals("A")){
            double increment = (max - min) / (num - 1);
            for (int i = 1; i < num - 1; i ++){
                out[i] = out[0] + i * increment;
            }
        } else {
            double logmin = Math.log(min);
            double increment = (Math.log(max)-logmin)/(num-1);
            for (int i = 1; i < num - 1; i++){
                out[i] = Math.exp( logmin + i * increment);
            }
        }
        return out;
    }

    public static double sum(double[] a){ 
        double out = 0; for (int i = 0; i < a.length; i++) out+=a[i]; return out;
    }
    
    public static double sum(double[][] a){
        double out = 0; for (int i = 0; i < a.length; i++) out+= sum(a[i]); return out;
    }

    public static double sum(double[][][] a){
        double out = 0; for (int i = 0; i < a.length; i++) out+= sum(a[i]); return out;
    }

    public static boolean hasNaN(double[] a){ 
        for (int i = 0; i < a.length; i++)
            if (Double.isNaN(a[i])) return true;
        return false;
    }
    
    public static boolean hasNaN(double[][] a){
        for (int i = 0; i < a.length; i++)
            if (hasNaN(a[i])) return true;
        return false;
    }

    public static boolean hasNaN(double[][][] a){
        for (int i = 0; i < a.length; i++)
            if (hasNaN(a[i])) return true;
        return false;
    }
    

    public static void main(String argv[]){
        try {
            double[] arr = getNumArray(argv[1]);
            System.out.println(formatArray("%.3f"," ",arr));
            for (int i = 0; i < arr.length; i++) arr[i] = Math.log(arr[i]);
            System.out.println(formatArray("%.3f"," ",arr));
        } catch (Exception e){
            e.printStackTrace();
        }
    }
}
