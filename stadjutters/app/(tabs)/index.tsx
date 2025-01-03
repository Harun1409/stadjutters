import { Image, StyleSheet, Platform, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {useSession} from "@/app/SessionContext";



export default function NotificationsScreen() {
  const { session } = useSession();

  return (
    <View style={styles.kikker}>
    </View>
  );
}

const styles = StyleSheet.create({
  kikker: {
    display: 'flex',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
});

// import React, { useState, useEffect } from 'react';
// import { 
//   FlatList, 
//   StyleSheet, 
//   Text, 
//   View, 
//   Image, 
//   ActivityIndicator, 
//   TextInput, 
//   TouchableOpacity, 
//   Modal, 
//   ScrollView,
//   Switch,
//   TouchableWithoutFeedback 
// } from 'react-native';
// import { supabase } from '../../lib/supabase';
// import { Link } from 'expo-router';  // Use Link from expo-router
// import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for icons

// interface Finding {
//   id: string; // Unique identifier
//   title: string;
//   stad: string;
//   image_url: string | null;
// }

// interface Category {
//   id: number;
//   description: string;
// }

// interface MaterialType {
//   id: number;
//   description: string;
// }

// const PAGE_SIZE = 15; // Number of items to load per page

// const fetchFindings = async (
//   page: number,
//   search?: string,
//   category?: string,
//   material?: string
// ): Promise<Finding[]> => {
//   try {
//     let query = supabase
//       .from('findings')
//       .select('id, title, stad, image_url, categoryId, materialTypeId')
//       .eq('findingTypeId', 'Huisvondst');

//     if (search) {
//       query = query.ilike('title', `%${search}%`);
//     }

//     if (category && material) {
//       query = query.eq('categoryId', category).eq('materialTypeId', material);
//     } else if (category) {
//       query = query.eq('categoryId', category);
//     } else if (material) {
//       query = query.eq('materialTypeId', material);
//     }

//     const { data, error } = await query
//       .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

//     if (error) {
//       console.error('FOUT BIJ HET OPHALEN VAN GEGEVENS:', error);
//       return [];
//     }

//     return data as Finding[];
//   } catch (error) {
//     console.error('ONVERWACHTE FOUT BIJ HET OPHALEN VAN GEGEVENS:', error);
//     return [];
//   }
// };

// const fetchSignedUrl = async (path: string) => {
//   try {
//     const { data, error } = await supabase
//       .storage
//       .from('UserUploadedImages/public')
//       .createSignedUrl(path, 60);

//     if (error) {
//       console.error('FOUT BIJ HET AANMAKEN VAN EEN ONDERTEKENDE URL:', error);
//       return null;
//     }

//     return data.signedUrl;
//   } catch (error) {
//     console.error('ONVERWACHTE FOUT BIJ HET AANMAKEN VAN EEN ONDERTEKENDE URL:', error);
//     return null;
//   }
// };

// export default function HomeScreen() {
//   const [findings, setFindings] = useState<Finding[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [page, setPage] = useState(0);
//   const [hasMore, setHasMore] = useState(true);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedCategory, setSelectedCategory] = useState('');
//   const [selectedMaterial, setSelectedMaterial] = useState('');
//   const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
//   const [isMaterialModalVisible, setMaterialModalVisible] = useState(false);
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

//   const loadFindings = async (nextPage: number, clearFindings: boolean = false) => {
//     if (!hasMore && !clearFindings) return;

//     if (clearFindings) {
//       setFindings([]); // BESTAANDE VONDSTEN WISSEN
//       setPage(0); // PAGINA RESETTEN
//       setHasMore(true); // RESET HASMORE
//     }

//     setLoadingMore(true);
//     const trimmedSearchQuery = searchQuery.trim(); // ZOEKOPDRACHT TRIMMEN
//     const data = await fetchFindings(nextPage, trimmedSearchQuery, selectedCategory, selectedMaterial);
//     if (data.length === 0) {
//       setHasMore(false);
//     } else {
//       const findingsWithUrls = await Promise.all(data.map(async (finding) => {
//         if (finding.image_url) {
//           const imageUrl = finding.image_url.split(',')[0].trim();
//           const signedUrl = await fetchSignedUrl(imageUrl);
//           return { ...finding, image_url: signedUrl };
//         }
//         return finding;
//       }));

//       setFindings((prev) => clearFindings ? findingsWithUrls : [...prev, ...findingsWithUrls]);
//     }
//     setLoadingMore(false);
//   };

//   const retrieveCategories = async () => {
//     const { data, error } = await supabase
//       .from('category')
//       .select('id, description');

//     if (error) {
//       console.error('FOUT BIJ HET OPHALEN VAN CATEGORIEËN:', error);
//       return;
//     }
//     setCategories(data || []);
//   };

//   const retrieveMaterialTypes = async () => {
//     const { data, error } = await supabase
//       .from('materialType')
//       .select('id, description');

//     if (error) {
//       console.error('FOUT BIJ HET OPHALEN VAN MATERIAALSOORTEN:', error);
//       return;
//     }
//     setMaterialTypes(data || []);
//   };

//   useEffect(() => {
//     const fetchInitialData = async () => {
//       setLoading(true);
//       await retrieveCategories();
//       await retrieveMaterialTypes();
//       await loadFindings(0, true); // BESTAANDE VONDSTEN WISSEN VOORDAT INITIËLE GEGEVENS WORDEN GELADEN
//       setLoading(false);
//     };

//     fetchInitialData();
//   }, []);

//   useEffect(() => {
//     const applyFilters = async () => {
//       setLoading(true);
//       await loadFindings(0, true); // BESTAANDE VONDSTEN WISSEN VOORDAT FILTERS WORDEN TOEGEPAST
//       setLoading(false);
//     };

//     applyFilters();
//   }, [selectedCategory, selectedMaterial]);

//   const handleSearch = async () => {
//     setLoading(true);
//     await loadFindings(0, true); // BESTAANDE VONDSTEN WISSEN VOORDAT ZOEKOPDRACHT WORDT TOEGEPAST
//     setLoading(false);
//   };

//   const handleLoadMore = () => {
//     if (!loadingMore && hasMore) {
//       setPage((prevPage) => {
//         const nextPage = prevPage + 1;
//         loadFindings(nextPage);
//         return nextPage;
//       });
//     }
//   };


//   const clearCategoryFilter = () => {
//     setSelectedCategory('');
//   };

//   const clearMaterialFilter = () => {
//     setSelectedMaterial('');
//   };

//   if (loading) {
//     return <ActivityIndicator size="large" style={styles.loadingIndicator} />;
//   }

//   return (
//     <View style={styles.container}>
//       {/* ZOEK BALK */}
//       <View style={styles.searchContainer}>
//         <TextInput
//           style={styles.searchBar}
//           placeholder="Search..."
//           value={searchQuery}
//           onChangeText={setSearchQuery}
//           onSubmitEditing={handleSearch} // ZOEKOPDRACHT UITVOEREN BIJ ENTER
//         />
//         <TouchableOpacity onPress={handleSearch} style={styles.searchIcon}>
//           <Ionicons name="search" size={24} color="gray" />
//         </TouchableOpacity>
//       </View>
//       {/* FILTER LABELS */}
//       <View style={styles.filterContainer}>
//         <View style={styles.filterLabelContainer}>
//           <TouchableOpacity onPress={() => setCategoryModalVisible(true)} style={[styles.filterLabel, {marginRight: 5}]}>
//             <Text>{categories.find(cat => cat.id.toString() === selectedCategory)?.description || 'Selecteer categorie'}</Text>
//           </TouchableOpacity>
//           {selectedCategory ? (
//             <TouchableOpacity onPress={clearCategoryFilter} style={styles.clearButton}>
//               <Ionicons name="close-circle" size={20} color="gray" />
//             </TouchableOpacity>
//           ) : null}
//         </View>
//         <View style={styles.filterLabelContainer}>
//           <TouchableOpacity onPress={() => setMaterialModalVisible(true)} style={[styles.filterLabel, {marginLeft: 5}]}>
//             <Text>{materialTypes.find(mat => mat.id.toString() === selectedMaterial)?.description || 'Selecteer materiaal'}</Text>
//           </TouchableOpacity>
//           {selectedMaterial ? (
//             <TouchableOpacity onPress={clearMaterialFilter} style={styles.clearButton}>
//               <Ionicons name="close-circle" size={20} color="gray" />
//             </TouchableOpacity>
//           ) : null}
//         </View>
//       </View>
//       {/* CATEGORIE MODAL */}
//       <Modal visible={isCategoryModalVisible} transparent={true}>
//         <TouchableWithoutFeedback onPress={() => setCategoryModalVisible(false)}>
//           <View style={styles.modalContainer}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 <Text style={styles.modalTitle}>Selecteer categorie</Text>
//                 <FlatList
//                   data={categories}
//                   keyExtractor={(item) => item.id.toString()}
//                   renderItem={({ item }) => (
//                     <TouchableOpacity
//                       onPress={() => {
//                         setSelectedCategory(item.id.toString());
//                         setCategoryModalVisible(false);
//                       }}
//                       style={styles.modalItem}
//                     >
//                       <Text style={{fontSize: 20}}>{item.description}</Text>
//                     </TouchableOpacity>
//                   )}
//                   style={styles.modalList}
//                 />
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>
//       {/* MATERIAAL MODAL */}
//       <Modal visible={isMaterialModalVisible} transparent={true}>
//         <TouchableWithoutFeedback onPress={() => setMaterialModalVisible(false)}>
//           <View style={styles.modalContainer}>
//             <TouchableWithoutFeedback>
//               <View style={styles.modalContent}>
//                 <Text style={styles.modalTitle}>Selecteer materiaal</Text>
//                 <FlatList
//                   data={materialTypes}
//                   keyExtractor={(item) => item.id.toString()}
//                   renderItem={({ item }) => (
//                     <TouchableOpacity
//                       onPress={() => {
//                         setSelectedMaterial(item.id.toString());
//                         setMaterialModalVisible(false);
//                       }}
//                       style={styles.modalItem}
//                     >
//                       <Text style={{fontSize: 20}}>{item.description}</Text>
//                     </TouchableOpacity>
//                   )}
//                   style={styles.modalList}
//                 />
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>
//       <FlatList
//         data={findings}
//         keyExtractor={(item, index) => index.toString()}
//         renderItem={({ item }) => (
//           <View style={styles.tile}>
//             <Link href={{
//                 pathname: '/weergaveVondst',
//                 params: { id: item.id }, // UNIEKE IDENTIFICATOR DOORGEVEN
//               }}>
//               {item.image_url && (
//                 <Image source={{ uri: item.image_url }} style={styles.image} />
//               )}
//               <View>
//                 <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
//                 <Text style={styles.stad}>{item.stad}</Text>
//               </View>
//             </Link>
//           </View>
//         )}
//         contentContainerStyle={styles.tilesContainer}
//         onEndReached={handleLoadMore}
//         onEndReachedThreshold={0.5}
//         ListFooterComponent={loadingMore ? <ActivityIndicator size="small" /> : null}
//         numColumns={2}  // AANTAL KOLOMMEN OP 2 INSTELLEN EN CONSTANT HOUDEN
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     padding: 10,
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     marginBottom: 10,
//   },
//   searchBar: {
//     flex: 1,
//     height: 40,
//     borderColor: 'gray',
//     borderWidth: 1,
//     borderRadius: 8,
//     paddingHorizontal: 10,
//   },
//   searchIcon: {
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 10,
//     position: 'absolute',
//     right: 10,
//   },
//   filterContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//     width: '100%',
//     padding: 0
//   },
//   filterLabelContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   filterLabel: {
//     flex: 1,
//     height: 40,
//     borderColor: 'gray',
//     borderWidth: 1,
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginHorizontal: 0,
//     backgroundColor: '#f0f0f0',
//   },
//   clearButton: {
//     marginHorizontal: 5,
//   },
//   modalContainer: {
//     flex: 1,
//     justifyContent: 'flex-end', // Align modal at the bottom
//     alignItems: 'center',
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//   },
//   modalContent: {
//     width: '100%', // Full width
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     padding: 20,
//     alignItems: 'center',
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
//   modalItem: {
//     paddingVertical: 10,
//     borderBottomWidth: 0,
//     borderBottomColor: '#ccc',
//     width: '100%',
//     alignItems: 'center',
//   },
//   tilesContainer: {
//     justifyContent: 'space-between',
//   },
//   tile: {
//     width: '48%', 
//     marginBottom: 10,
//     backgroundColor: '#f0f0f0',
//     padding: 10,
//     borderRadius: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 2,
//     marginEnd: 15,
//     marginTop: 6,
//   },
//   image: {
//     width: '100%',
//     height: 150,
//     borderRadius: 8,
//     marginBottom: 10,
//   },
//   title: {
//     marginTop: 5,
//     fontWeight: 'bold',
//     fontSize: 14,
//     color: '#333',
//     marginBottom: 5, 
//   },
//   stad: {
//     fontSize: 12, 
//     color: '#666', 
//     marginTop: 0,
//   },
//   loadingIndicator: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalList: { maxHeight: 220, 
//     width: '100%', 
//   },
// });
